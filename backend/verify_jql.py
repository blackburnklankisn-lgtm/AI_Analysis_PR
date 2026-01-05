def clean_kw(k: str) -> bool:
    if any(char in k for char in ['{', '}', '[', ']', '#', ':', '\"']): return False
    if len(k) > 40: return False
    if len(k.strip()) < 2: return False
    return True

def generate_jql(kw_data):
    project_filter = 'project = "CGF"'
    issuetype_filter = 'issuetype = "Problem Report (PR)"'
    
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
    return search_query

# Test Scenarios
scenarios = [
    {
        "name": "Standard Scenario",
        "kw_data": {
            "core_intent": ["CCU 升级失败", "SWITCH 通讯异常"],
            "fingerprints": ["0x7F", "NRC 11"],
            "general_terms": ["OTA", "eMMC"]
        }
    },
    {
        "name": "No Intent",
        "kw_data": {
            "core_intent": [],
            "fingerprints": ["0x7F"],
            "general_terms": ["CCU"]
        }
    },
    {
        "name": "No Details",
        "kw_data": {
            "core_intent": ["CCU 升级失败"],
            "fingerprints": [],
            "general_terms": []
        }
    },
    {
        "name": "Special Characters (Should be cleaned)",
        "kw_data": {
            "core_intent": ["CCU {error}"],
            "fingerprints": ["[log] 123", "0x7F"],
            "general_terms": ["OTA#1", "valid_term"]
        }
    }
]

for s in scenarios:
    print(f"--- Scenario: {s['name']} ---")
    jql = generate_jql(s['kw_data'])
    print(f"JQL: {jql}\n")
