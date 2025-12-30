import google.generativeai as genai
from typing import List, Dict, Any
import PIL.Image
import os

class AIReasoning:
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')

    def extract_keywords(self, issue_details: Dict[str, Any], image_paths: List[str] = None) -> Dict[str, List[str]]:
        """
        Uses AI to extract stratified search keywords:
        - core_intent: 2-3 most critical business combo (e.g., ["SWITCH", "升级失败"])
        - fingerprints: high-value terms (error codes, version IDs, function names)
        - general_terms: module names, generic actions
        """
        comments_text = "\n".join([f"{c['author']}: {c['body']}" for c in issue_details.get('comments', [])])
        
        prompt_text = f"""
作为汽车电子软件诊断专家，请从以下 PR 信息中提取用于检索相似案例的关键信息。
**注意：禁止输出当前单据本身的 ID ({issue_details['key']})，也请排除掉过于琐碎、不具备跨单据搜索价值的临时本地路径。**

请将关键词分为三类：
1. **core_intent (核心意图)**: 描述问题的核心业务路径，通常是“组件 + 动作/故障”。例如：["CCU", "升级失败"], ["SWITCH", "响应超时"]。这是最重要的搜索词。
2. **fingerprints (硬核指纹)**: 极其具体的报错代码 (如 0x7F, NRC 11)、软件版本号 (如 0E25...)、特定的底层驱动名。
3. **general_terms (通用词)**: 模块名称 (如 CCU, HSM)、通用的动作。

### PR 信息
- **标题**: {issue_details['summary']}
- **描述**: {issue_details['description']}
- **评论内容**: 
{comments_text}

### 任务
请按以下 JSON 格式返回，确保 core_intent 极其精简且准确。直接输出 JSON。
{{
  "core_intent": ["词1", "词2"],
  "fingerprints": ["词3", "词4"],
  "general_terms": ["词5", "词6"]
}}
"""
        content = [prompt_text]
        if image_paths:
            for path in image_paths:
                if os.path.exists(path):
                    content.append(PIL.Image.open(path))

        response = self.model.generate_content(content)
        import json
        import re
        try:
            match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if match:
                data = json.loads(match.group())
                if isinstance(data, dict):
                    # Ensure all keys exist to prevent crashes downstream
                    return {
                        "core_intent": data.get("core_intent", []),
                        "fingerprints": data.get("fingerprints", []),
                        "general_terms": data.get("general_terms", [])
                    }
            return {"core_intent": [], "fingerprints": [], "general_terms": []}
        except:
            return {"core_intent": [], "fingerprints": [], "general_terms": []}

    def rerank_candidates(self, current_issue: Dict[str, Any], candidates: List[Dict[str, Any]], top_n: int = 20) -> List[Dict[str, Any]]:
        """
        AI performs lightweight semantic check to filter 100 candidates down to top_n.
        """
        if not candidates:
            return []
        
        # Build a list for reranking
        cand_text = "\n".join([f"- {c['key']}: {c['summary']}" for c in candidates])
        
        prompt = f"""
请扮演专家，从以下 {len(candidates)} 个候选 Jira 标题中，挑选出与当前 PR 最相关的 {top_n} 个。

**筛选准则**：
1. **意图第一 (Intent Priority)**：优先保留体现故障本质动作（如：升级失败、响应超时）的单据。
2. **通俗业务优先 (General Terms > Fingerprints)**：在匹配具体技术特征时，优先考虑针对模块/功能的通用词（如：OTA, eMMC, CCU），哪怕它们的版本号或具体错误地址没有对齐，也比仅匹配上一串冷门错误代码的单据更重要。
3. **拒绝模块名泛匹配**：虽然通用词重要，但也要防止被“CCU”这种泛滥词带偏。必须是“模块+特定故障动作”的组合才选。

### 当前 PR
- **标题**: {current_issue['summary']}
- **描述**: {current_issue['description']}

### 待精选的候选单据
{cand_text}

### 任务
请直接按相关度从高到低返回这 {top_n} 个单据的 ID (Key)，用逗号分隔，不要多余文字。
"""
        response = self.model.generate_content(prompt)
        selected_keys = [k.strip() for k in response.text.split(',')]
        
        # Map back to original candidate objects and keep order
        candidates_map = {c['key']: c for c in candidates}
        reranked = []
        for key in selected_keys:
            if key in candidates_map:
                reranked.append(candidates_map[key])
        
        # If AI didn't return enough or valid keys, fallback to original order up to top_n
        if not reranked:
            return candidates[:top_n]
            
        return reranked[:top_n]

    def analyze_pr(self, current_issue: Dict[str, Any], historical_issues: List[Dict[str, Any]], log_fingerprint: str, image_paths: List[str] = None) -> Dict[str, Any]:
        prompt = self._build_prompt(current_issue, historical_issues, log_fingerprint)
        
        content = [prompt]
        if image_paths:
            for path in image_paths:
                if os.path.exists(path):
                    content.append(PIL.Image.open(path))

        response = self.model.generate_content(content)
        raw_response = response.text
        
        return {
            "report": raw_response,
            "raw_prompt": prompt,
            "raw_response": raw_response
        }

    def generate_relevance_scores(self, current_issue: Dict[str, Any], candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        AI evaluates each candidate and provides a reason for its inclusion/relevance.
        """
        if not candidates:
            return []
            
        candidate_list_text = "\n".join([f"- {c['key']}: {c['summary']}" for c in candidates])
        
        prompt = f"""
请对比当前 PR 和以下搜寻到的历史候选单据。
针对每一个候选单据，给出其被选中的理由（为什么它与当前问题相关），并评估其相似度等级（极高/高/中）。

### 当前 PR
标题: {current_issue['summary']}
描述: {current_issue['description']}

### 候选 PR 列表
{candidate_list_text}

### 任务
请按以下 JSON 数组格式返回（直接给出 JSON，不要有 Markdown 代码块标签，也不要有其他文字）：
[
  {{ "key": "ID", "reason": "在此处填写一句话理由", "similarity": "极高/高/中", "score": 95 }}
]
重点关注：错误码、组件模块、操作阶段的重合点。
"""
        response = self.model.generate_content(prompt)
        import json
        import re
        try:
            # Try to find JSON in response
            text = response.text
            match = re.search(r'\[\s*\{.*\}\s*\]', text, re.DOTALL)
            if match:
                return json.loads(match.group())
            # Fallback if AI didn't format perfectly
            return []
        except Exception as e:
            print(f"Relevance scoring failed: {e}")
            return []

    def _build_prompt(self, current_pr: Dict[str, Any], historical_prs: List[Dict[str, Any]], log_fingerprint: str) -> str:
        history_text = ""
        for i, h_pr in enumerate(historical_prs):
            history_text += f"--- 历史参考 {i+1} ---\n"
            history_text += f"Key: {h_pr['key']}\n"
            history_text += f"Summary: {h_pr['summary']}\n"
            history_text += f"描述/评论摘要: {h_pr.get('description', '')[:500]}...\n"
            history_text += f"根因: {h_pr.get('root_cause', '未知')}\n\n"

        curr_comments = "\n".join([f"{c['author']}: {c['body']}" for c in current_pr.get('comments', [])])

        prompt = f"""
你是一位资深汽车电子软件专家，专门负责 OTA 升级及中央计算单元 (CCU/SWITCH) 的故障诊断。
请结合当前 PR 的全量细节、历史相似案例以及日志指纹，给出一份深度诊断报告。

### 1. 当前待诊断 PR 全量细节
- **ID**: {current_pr['key']}
- **标题**: {current_pr['summary']}
- **详细描述**: {current_pr['description']}
- **评论记录**: 
{curr_comments}

### 2. 日志指纹 (Log Fingerprint)
\"\"\"
{log_fingerprint}
\"\"\"

### 3. 检索到的 Top-{len(historical_prs)} 历史相似 PR (包含评论/根因参考)
{history_text}

---
### 深度诊断任务要求
请输出 Markdown 格式报告：

#### A. 重复性与相似度深度评估
- 对比当前 PR 与历史 Top-10 案例，是否存在高度一致的错误模式？
- 指出最具有参考价值的历史 Key，并解释逻辑重合点。

#### B. 故障根因深度推断 (Root Cause Analysis)
- 结合评论中的讨论（如开发者的初步判断）和日志中的硬核证据。
- 如果涉及 CCU/SWITCH，请区分是“通讯中断”、“逻辑死锁”还是“底层驱动错误”。

#### C. 专家级排查建议 (Action Plan)
- 给出 3-5 条极具针对性的建议。

#### D. 结论汇总
- 一句话总结：该问题是“已知待修复”、“新发现的 Bug”、“环境配置问题”还是“硬件故障”。

请使用严谨的中文术语，回答要硬核、专业、直击本质。
"""
        return prompt
