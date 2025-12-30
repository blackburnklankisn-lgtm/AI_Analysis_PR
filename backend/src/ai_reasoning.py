import google.generativeai as genai
from typing import List, Dict, Any

class AIReasoning:
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')

    def analyze_pr(self, current_pr: Dict[str, Any], historical_prs: List[Dict[str, Any]], log_fingerprint: str) -> str:
        prompt = self._build_prompt(current_pr, historical_prs, log_fingerprint)
        
        response = self.model.generate_content(prompt)
        return response.text

    def _build_prompt(self, current_pr: Dict[str, Any], historical_prs: List[Dict[str, Any]], log_fingerprint: str) -> str:
        history_text = ""
        for i, h_pr in enumerate(historical_prs):
            history_text += f"--- Historical PR {i+1} ---\n"
            history_text += f"Key: {h_pr['key']}\n"
            history_text += f"Summary: {h_pr['summary']}\n"
            history_text += f"Description: {h_pr['description']}\n"
            history_text += f"Root Cause: {h_pr.get('root_cause', 'N/A')}\n\n"

        prompt = f"""
你是一位资深汽车电子软件专家。请根据以下信息对当前的新 PR（问题报告）进行诊断。

### 当前 PR 信息
- **ID**: {current_pr['key']}
- **Summary**: {current_pr['summary']}
- **Description**: {current_pr['description']}

### 提取的日志特征 (Log Fingerprint)
{log_fingerprint}

### 检索到的 Top-3 历史相似 PR
{history_text}

---
### 任务
请进行深入分析并输出一份 Markdown 格式的报告，包含以下部分：
1. **重复性判断**: 该问题是否已在历史 PR 中出现过？
2. **相似度分析**: 如果有相似问题，给出一个百分比并解释原因。
3. **核心排查建议**: 根据日志指纹和历史经验，建议接下来的分析步骤。
4. **可能的原因 (Root Cause)**: 给出几种可能的根因猜测。

请使用专业且简洁的中文回答。
"""
        return prompt
