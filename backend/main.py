from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import shutil

from src.jira_connector import JiraConnector
from src.log_processor import LogProcessor
from src.ai_reasoning import AIReasoning

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import JSONResponse
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"}
    )

class DiagnosticRequest(BaseModel):
    issue_key: str
    gemini_api_key: str
    customer_username: str
    customer_password: str
    internal_username: str
    internal_password: str
    customer_jira_url: str = "https://jira.gacrnd.com:8443"
    internal_jira_url: str = "https://ix.jira.automotive.cloud"
    search_target: str = "CUSTOMER" # "CUSTOMER" or "INTERNAL"
    customer_project: str = "XH2CONTI"
    internal_project: str = "CGF"
    customer_issuetype: str = "BUG"
    internal_issuetype: str = "Problem Report (PR)"

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/diagnose")
async def run_diagnostic(req: DiagnosticRequest):
    print(f"Received diagnostic request for issue: {req.issue_key}")
    # Initialize trace with all possible fields
    trace = {
        "extracted_keywords": [],
        "stratified_keywords": {"core_intent": [], "fingerprints": [], "general_terms": []},
        "initial_search_query": "",
        "historical_candidates": [],
        "deep_context_count": 0,
        "raw_prompt": "",
        "raw_ai_response": ""
    }
    
    temp_dir = f"data/{req.issue_key}"
    os.makedirs(temp_dir, exist_ok=True)

    def robust_cleanup(path, retries=3, delay=0.5):
        import time
        for i in range(retries):
            try:
                if os.path.exists(path):
                    shutil.rmtree(path)
                return
            except Exception as e:
                if i < retries - 1:
                    print(f"Cleanup failed (attempt {i+1}), retrying in {delay}s... Error: {e}")
                    time.sleep(delay)
                else:
                    print(f"Cleanup failed after {retries} attempts: {e}")

    try:
        # 1. Initialization and Step 1: Fetch Current Issue Full Details
        customer_jira = JiraConnector(req.customer_jira_url, req.customer_username, req.customer_password)
        internal_jira = JiraConnector(req.internal_jira_url, req.internal_username, req.internal_password)
        
        current_issue = None
        source_name = "客户 Jira"
        
        try:
            current_issue = customer_jira.get_issue(req.issue_key)
        except Exception as e:
            if "404" in str(e):
                try:
                    current_issue = internal_jira.get_issue(req.issue_key)
                    source_name = "内部 Jira"
                except Exception as e2:
                    if "404" in str(e2):
                        raise HTTPException(status_code=404, detail=f"在客户及内部 Jira 服务器中均未找到 ID: {req.issue_key}")
                    raise e2
            else:
                raise e

        ai = AIReasoning(req.gemini_api_key)
        active_connector = customer_jira if source_name == "客户 Jira" else internal_jira

        # 2. Step 2: Download Images for Current Issue & AI Keyword Extraction
        print("Downloading images for keyword extraction...")
        current_image_paths = []
        for img in current_issue.get('images', []):
            dest = os.path.join(temp_dir, f"curr_{img['filename']}")
            active_connector.download_attachment(img['url'], dest)
            current_image_paths.append(dest)

        print("Extracting keywords via AI (Stratified)...")
        kw_data = ai.extract_keywords(current_issue, current_image_paths)
        trace["stratified_keywords"] = kw_data
        trace["extracted_keywords"] = kw_data.get("core_intent", []) + kw_data.get("fingerprints", []) + kw_data.get("general_terms", [])
        
        # 3. Step 3: Deep Search (Dynamic Target - Plan 5 Improved)
        active_search_connector = customer_jira if req.search_target == "CUSTOMER" else internal_jira
        search_target_name = "客户 Jira" if req.search_target == "CUSTOMER" else "内部 Jira"
        project_key = req.customer_project if req.search_target == "CUSTOMER" else req.internal_project
        issuetype = req.customer_issuetype if req.search_target == "CUSTOMER" else req.internal_issuetype
        
        project_filter = f'project = "{project_key}"'
        issuetype_filter = f'issuetype = "{issuetype}"'
        
        # Keyword Cleaning & Sanitization logic
        def clean_kw(k: str) -> bool:
            if any(char in k for char in ['{', '}', '[', ']', '#', ':', '\"']): return False
            if len(k) > 40: return False
            if len(k.strip()) < 2: return False
            return True

        # Extract and clean groups
        raw_intents = kw_data.get("core_intent", [])
        raw_generals = kw_data.get("general_terms", [])
        raw_fingerprints = kw_data.get("fingerprints", [])

        valid_intents = [k for k in raw_intents if clean_kw(k)]
        valid_details = [k for k in raw_generals if clean_kw(k)] + [k for k in raw_fingerprints if clean_kw(k)]
        
        # Construct Groups
        intent_list = [f'text ~ "{k}"' for k in valid_intents]
        detail_list = [f'text ~ "{k}"' for k in valid_details]
        
        intent_clause = f"({' OR '.join(intent_list)})" if intent_list else ""
        detail_clause = f"({' OR '.join(detail_list)})" if detail_list else ""
        
        # Combine everything with User's specific logic: (Intent ORs) AND (Detail ORs)
        search_query = f"{project_filter} AND {issuetype_filter}"
        
        if intent_clause and detail_clause:
            search_query += f" AND {intent_clause} AND {detail_clause}"
        elif intent_clause:
            search_query += f" AND {intent_clause}"
        elif detail_clause:
            search_query += f" AND {detail_clause}"
            
        search_query += " ORDER BY created DESC"
        trace["initial_search_query"] = search_query
        
        print(f"Coarse Retrieval (Plan 5 - {search_target_name}): Searching for up to 100 candidates with JQL: {search_query}")
        # Search for candidates on the active search connector
        initial_candidates = active_search_connector.search_issues(search_query, max_results=100)
        
        # 4. Step 4: Semantic Reranking (AI Refinement)
        print(f"Semantic Reranking: AI filtering {len(initial_candidates)} candidates down to Top 10...")
        candidate_stubs = ai.rerank_candidates(current_issue, initial_candidates, top_n=10)
        
        # 5. Step 5: AI Relevance Explanation for the reranked Top 10
        print(f"Generating relevance explanations for {len(candidate_stubs)} final candidates...")
        relevance_data = ai.generate_relevance_scores(current_issue, candidate_stubs)
        relevance_map = {item['key']: item for item in relevance_data}
        
        trace["historical_candidates"] = []
        for c in candidate_stubs:
            rel = relevance_map.get(c['key'], {"reason": "语义重排入选", "similarity": "中", "score": 60})
            trace["historical_candidates"].append({
                "key": c["key"],
                "summary": c["summary"],
                "reason": rel.get('reason', '语义重排入选'),
                "similarity": rel.get('similarity', '高' if c['key'] in [r['key'] for r in relevance_data] else '中'),
                "score": rel.get('score', 70)
            })
        
        # 6. Step 6: Fetch Full Details for Candidates
        print(f"Fetching full details for {len(candidate_stubs)} candidates from {search_target_name}...")
        full_historical_issues = []
        # Create a lookup map for trace candidates to update them
        trace_candidates_map = {c['key']: i for i, c in enumerate(trace["historical_candidates"])}
        
        for stub in candidate_stubs:
            try:
                full_issue = active_search_connector.get_issue(stub["key"])
                full_issue['relevance_reason'] = relevance_map.get(stub['key'], {}).get('reason', '')
                full_historical_issues.append(full_issue)
                
                # Update trace with more details from full issue
                if stub['key'] in trace_candidates_map:
                    idx = trace_candidates_map[stub['key']]
                    trace["historical_candidates"][idx]['root_cause'] = full_issue.get('root_cause', '未知')
                    trace["historical_candidates"][idx]['created'] = full_issue.get('created', '')
            except Exception as e:
                print(f"Failed to fetch details for candidate {stub['key']}: {e}")
        trace["deep_context_count"] = len(full_historical_issues)

        # 6.5. Download images for historical PRs (max 10 per PR)
        print(f"Downloading images for {len(full_historical_issues)} historical PRs...")
        all_historical_image_paths = []
        for h_issue in full_historical_issues:
            h_image_paths = []
            for img in h_issue.get('images', [])[:10]:  # Limit to 10 images per historical PR
                try:
                    dest = os.path.join(temp_dir, f"hist_{h_issue['key']}_{img['filename']}")
                    active_search_connector.download_attachment(img['url'], dest)
                    h_image_paths.append(dest)
                except Exception as e:
                    print(f"Failed to download image {img['filename']} for {h_issue['key']}: {e}")
            h_issue['local_image_paths'] = h_image_paths
            all_historical_image_paths.extend(h_image_paths)
        print(f"Downloaded {len(all_historical_image_paths)} historical images total")

        # 7. Log Processing
        log_processor = LogProcessor()
        log_fingerprints = []
        
        # Process Logs
        for log_file in current_issue.get('logs', []):
            dest = os.path.join(temp_dir, log_file['filename'])
            active_connector.download_attachment(log_file['url'], dest)
            fingerprint = log_processor.process_log(dest)
            log_fingerprints.append(f"File: {log_file['filename']}\n{fingerprint}")
        
        combined_logs = "\n\n".join(log_fingerprints) if log_fingerprints else "No logs found."

        # 8. Final AI Reasoning
        print("Generating final diagnostic report with multimodal context...")
        # Combine current issue images + historical PR images for multimodal analysis
        all_image_paths = current_image_paths + all_historical_image_paths
        print(f"Total images for AI analysis: {len(all_image_paths)} ({len(current_image_paths)} current + {len(all_historical_image_paths)} historical)")
        reasoning_output = ai.analyze_pr(current_issue, full_historical_issues, combined_logs, all_image_paths)
        
        trace["raw_prompt"] = reasoning_output["raw_prompt"]
        trace["raw_ai_response"] = reasoning_output["raw_response"]

        return {
            "issue_key": req.issue_key,
            "summary": current_issue['summary'],
            "report": reasoning_output["report"],
            "trace": trace,
            "status": "success"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Final Cleanup attempt
        robust_cleanup(temp_dir)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
