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
        issue = self.jira.issue(issue_key, expand="comments,attachments")
        
        # Extract Attachments
        images = []
        logs = []
        for attachment in issue.fields.attachment:
            item = {
                "filename": attachment.filename,
                "url": attachment.content,
                "id": attachment.id,
                "size": getattr(attachment, 'size', 0)
            }
            if attachment.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                images.append(item)
            elif attachment.filename.lower().endswith(('.log', '.txt')):
                logs.append(item)
        
        # Extract Comments
        comments = []
        for comment in issue.fields.comment.comments:
            comments.append({
                "author": str(comment.author),
                "body": comment.body,
                "created": comment.created
            })
            
        return {
            "key": issue.key,
            "summary": issue.fields.summary,
            "description": issue.fields.description or "",
            "attachments": logs + images,  # Compatibility
            "images": images,
            "logs": logs,
            "comments": comments
        }

    def download_attachment(self, url: str, destination_path: str):
        response = self.jira._session.get(url, stream=True, verify=False)
        with open(destination_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=1024):
                if chunk:
                    f.write(chunk)

    def search_issues(self, jql: str, max_results: int = 5) -> List[Dict[str, Any]]:
        # If it's already a complex JQL (contains ~, =, OR), use it directly
        # Otherwise, wrap it in a text search
        if not any(op in jql for op in ['~', '=', 'OR', 'AND']):
            jql = f'text ~ "{jql}" ORDER BY created DESC'
        
        print(f"Executing JQL: {jql}")
        
        try:
            issues = self.jira.search_issues(jql, maxResults=max_results)
            results = []
            for issue in issues:
                # Attempt to find a root cause field, or use a default
                # customfield_10000 is often used but varies by Jira instance
                rc = "N/A"
                if hasattr(issue.fields, "customfield_10000") and issue.fields.customfield_10000:
                    rc = str(issue.fields.customfield_10000)
                
                results.append({
                    "key": issue.key,
                    "summary": issue.fields.summary,
                    "description": issue.fields.description or "",
                    "root_cause": rc
                })
            return results
        except Exception as e:
            print(f"Jira search failed for JQL '{jql}': {e}")
            return []
