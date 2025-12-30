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

class DiagnosticRequest(BaseModel):
    issue_key: str
    gemini_api_key: str
    customer_username: str
    customer_password: str
    internal_username: str
    internal_password: str
    customer_jira_url: str = "https://jira.gacrnd.com:8443"
    internal_jira_url: str = "https://ix.jira.automotive.cloud"

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/diagnose")
async def run_diagnostic(req: DiagnosticRequest):
    print(f"Received diagnostic request for issue: {req.issue_key}")
    # Base path for temporary files
    temp_dir = f"data/{req.issue_key}"
    os.makedirs(temp_dir, exist_ok=True)

    try:
        # 1. Connect and Fetch
        customer_jira = JiraConnector(req.customer_jira_url, req.customer_username, req.customer_password)
        internal_jira = JiraConnector(req.internal_jira_url, req.internal_username, req.internal_password)
        
        current_issue = None
        source_name = "客户 Jira"
        
        try:
            current_issue = customer_jira.get_issue(req.issue_key)
        except Exception as e:
            if "404" in str(e):
                print(f"Issue {req.issue_key} not found in Customer Jira, trying Internal Jira...")
                try:
                    current_issue = internal_jira.get_issue(req.issue_key)
                    source_name = "内部 Jira"
                except Exception as e2:
                    if "404" in str(e2):
                        raise HTTPException(status_code=404, detail=f"在客户及内部 Jira 服务器中均未找到 ID: {req.issue_key}")
                    raise e2
            else:
                raise e

        # 2. Search Internal History
        search_query = current_issue['summary']
        historical_issues = internal_jira.search_issues(search_query, max_results=3)

        # 3. Log Processing
        log_processor = LogProcessor()
        log_fingerprints = []
        
        # Determine which connector to use for download (where the issue was found)
        active_connector = customer_jira if source_name == "客户 Jira" else internal_jira
        
        for attachment in current_issue['attachments']:
            if attachment['filename'].endswith(('.log', '.txt')):
                dest = os.path.join(temp_dir, attachment['filename'])
                active_connector.download_attachment(attachment['url'], dest)
                
                fingerprint = log_processor.process_log(dest)
                log_fingerprints.append(f"File: {attachment['filename']}\n{fingerprint}")
        
        combined_logs = "\n\n".join(log_fingerprints) if log_fingerprints else "No logs found."

        # 4. AI Reasoning
        ai = AIReasoning(req.gemini_api_key)
        report = ai.analyze_pr(current_issue, historical_issues, combined_logs)

        # Cleanup
        shutil.rmtree(temp_dir)

        return {
            "issue_key": req.issue_key,
            "summary": current_issue['summary'],
            "report": report,
            "status": "success"
        }

    except Exception as e:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
