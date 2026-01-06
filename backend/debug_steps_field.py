"""
Jira 字段调试脚本 - 用于诊断"重现步骤"字段提取问题
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.jira_connector import JiraConnector

# 请填入您的凭据
JIRA_URL = "https://jira.gacrnd.com:8443"
USERNAME = "qiaoye.li"  # 替换为实际用户名
PASSWORD = "lqy123456"  # 替换为实际密码
ISSUE_KEY = "XH2CONTI-22035"  # 要诊断的 Issue

def debug_fields():
    print("=" * 60)
    print("Jira 字段调试")
    print("=" * 60)
    
    connector = JiraConnector(JIRA_URL, USERNAME, PASSWORD)
    
    # 1. 获取所有字段定义
    print("\n[1] 查找包含'重现'或'步骤'的字段...")
    all_fields = connector.jira.fields()
    matching_fields = []
    
    for field in all_fields:
        field_name = field.get('name', '')
        field_id = field.get('id', '')
        if '重现' in field_name or '步骤' in field_name or 'reproduce' in field_name.lower():
            matching_fields.append((field_id, field_name))
            print(f"  找到匹配字段: id='{field_id}', name='{field_name}'")
    
    if not matching_fields:
        print("  未找到匹配字段，列出所有自定义字段...")
        for field in all_fields:
            if field.get('id', '').startswith('customfield_'):
                print(f"  - {field.get('id')}: {field.get('name')}")
    
    # 2. 获取具体 Issue 并检查字段值
    print(f"\n[2] 获取 Issue {ISSUE_KEY} 的详细信息...")
    issue = connector.jira.issue(ISSUE_KEY)
    
    print(f"\n[3] 检查 Issue 上的字段值...")
    for field_id, field_name in matching_fields:
        if hasattr(issue.fields, field_id):
            value = getattr(issue.fields, field_id)
            print(f"\n  字段 '{field_name}' ({field_id}):")
            print(f"    类型: {type(value)}")
            if value:
                if isinstance(value, str):
                    print(f"    值 (前200字符): {value[:200]}...")
                elif isinstance(value, dict):
                    print(f"    键: {list(value.keys())}")
                    if 'content' in value:
                        print(f"    content 类型: {type(value['content'])}")
                elif hasattr(value, '__dict__'):
                    print(f"    属性: {list(value.__dict__.keys()) if hasattr(value, '__dict__') else 'N/A'}")
                else:
                    print(f"    值: {str(value)[:200]}")
            else:
                print(f"    值: None 或空")
        else:
            print(f"\n  字段 '{field_name}' ({field_id}) 不存在于 issue.fields")
    
    # 3. 尝试用当前逻辑提取
    print(f"\n[4] 用 get_issue 方法测试提取...")
    result = connector.get_issue(ISSUE_KEY)
    steps = result.get('steps_to_reproduce', '')
    print(f"  提取结果长度: {len(steps)} 字符")
    if steps:
        print(f"  前 300 字符: {steps[:300]}...")
    else:
        print("  未能提取到内容!")

if __name__ == "__main__":
    debug_fields()
