import os
import urllib3
from jira import JIRA
from typing import List, Dict, Any

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class JiraConnector:
    def __init__(self, server_url: str, username: str, token: str):
        self.server_url = server_url
        self.username = username
        self.token = token
        self.jira = None
        self._connect()

    def _connect(self):
        try:
            # options = {"verify": False}
            self.jira = JIRA(
                server=self.server_url,
                basic_auth=(self.username, self.token),
                options={"verify": False}
            )
        except Exception as e:
            print(f"Error connecting to Jira {self.server_url}: {e}")
            raise

    def get_issue(self, issue_key: str) -> Dict[str, Any]:
        issue = self.jira.issue(issue_key)
        attachments = []
        for attachment in issue.fields.attachment:
            attachments.append({
                "filename": attachment.filename,
                "url": attachment.content,
                "id": attachment.id
            })
        
        return {
            "key": issue.key,
            "summary": issue.fields.summary,
            "description": issue.fields.description,
            "attachments": attachments
        }

    def download_attachment(self, url: str, destination_path: str):
        response = self.jira._session.get(url, stream=True, verify=False)
        with open(destination_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=1024):
                if chunk:
                    f.write(chunk)

    def search_issues(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        # Simple search using keywords
        jql = f'summary ~ "{query}" OR description ~ "{query}" ORDER BY created DESC'
        issues = self.jira.search_issues(jql, maxResults=max_results)
        results = []
        for issue in issues:
            results.append({
                "key": issue.key,
                "summary": issue.fields.summary,
                "description": issue.fields.description,
                "root_cause": getattr(issue.fields, "customfield_10000", "Unknown") # Placeholder for root cause field
            })
        return results
