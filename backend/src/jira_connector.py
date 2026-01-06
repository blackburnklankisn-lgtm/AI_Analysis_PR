import os
import re
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
        all_attachments = []  # Keep track of all attachments for comment image matching
        
        for attachment in issue.fields.attachment:
            item = {
                "filename": attachment.filename,
                "url": attachment.content,
                "id": attachment.id,
                "size": getattr(attachment, 'size', 0),
                "source": "attachment"  # Mark source for traceability
            }
            all_attachments.append(item)
            
            if attachment.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp')):
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
        
        # Extract images referenced in comments
        comment_images = self._extract_comment_images(comments, all_attachments)
        
        # Merge comment images into images list (avoid duplicates)
        existing_ids = {img['id'] for img in images}
        for ci in comment_images:
            if ci['id'] not in existing_ids:
                ci['source'] = 'comment'  # Mark as discovered from comment
                images.append(ci)
                existing_ids.add(ci['id'])
        
        print(f"[{issue_key}] Found {len(images)} images ({len(comment_images)} from comments)")
        
        # Extract Steps to Reproduce (重现步骤) - probe common custom field IDs
        steps_to_reproduce = self._extract_steps_to_reproduce(issue)
            
        return {
            "key": issue.key,
            "summary": issue.fields.summary,
            "description": issue.fields.description or "",
            "steps_to_reproduce": steps_to_reproduce,
            "attachments": logs + images,  # Compatibility
            "images": images,
            "logs": logs,
            "comments": comments
        }

    def _extract_steps_to_reproduce(self, issue) -> str:
        """
        Extract "重现步骤" (Steps to Reproduce) from custom fields.
        Probes common custom field IDs since the actual ID varies by Jira instance.
        """
        # First, try to find by EXACT field name match (priority order matters)
        try:
            all_fields = self.jira.fields()
            steps_field_id = None
            
            # Priority 1: Exact match for "重现步骤"
            for field in all_fields:
                field_name = field.get('name', '')
                if field_name == '重现步骤':
                    steps_field_id = field.get('id')
                    print(f"[Steps to Reproduce] Found exact match: name='{field_name}', id='{steps_field_id}'")
                    break
            
            # Priority 2: Other names if exact not found
            if not steps_field_id:
                for field in all_fields:
                    field_name = field.get('name', '')
                    if field_name in ['Steps to Reproduce', 'Repro Steps', 'STR', 'Reproduction Steps']:
                        steps_field_id = field.get('id')
                        print(f"[Steps to Reproduce] Found field: name='{field_name}', id='{steps_field_id}'")
                        break
            
            if steps_field_id:
                if hasattr(issue.fields, steps_field_id):
                    value = getattr(issue.fields, steps_field_id)
                    if value:
                        extracted = self._extract_field_value(value)
                        if extracted:
                            print(f"[Steps to Reproduce] Successfully extracted {len(extracted)} chars from {steps_field_id}")
                            return extracted
                        
        except Exception as e:
            print(f"Warning: Could not query Jira fields metadata: {e}")
        
        # Fallback: probe a wider range of common custom field IDs
        candidate_field_ids = [
            'customfield_10014', 'customfield_10015', 'customfield_10016', 'customfield_10017',
            'customfield_10018', 'customfield_10019', 'customfield_10020', 'customfield_10021',
            'customfield_10100', 'customfield_10101', 'customfield_10102', 'customfield_10103',
            'customfield_10200', 'customfield_10201', 'customfield_10202', 'customfield_10203',
            'customfield_10300', 'customfield_10301', 'customfield_10400', 'customfield_10401',
            'customfield_10500', 'customfield_10501', 'customfield_10600', 'customfield_10700',
            'customfield_10800', 'customfield_10900', 'customfield_11000', 'customfield_11100',
            'customfield_11200', 'customfield_11300', 'customfield_11400', 'customfield_11500',
            'customfield_12000', 'customfield_12100', 'customfield_12200', 'customfield_12300',
        ]
        
        for field_id in candidate_field_ids:
            if hasattr(issue.fields, field_id):
                value = getattr(issue.fields, field_id)
                if value:
                    extracted = self._extract_field_value(value)
                    if extracted and len(extracted) > 50:  # Likely to be Steps to Reproduce if long
                        print(f"[Steps to Reproduce] Found potential match in {field_id}: {len(extracted)} chars")
                        return extracted
        
        print(f"[Steps to Reproduce] Could not find Steps to Reproduce field for {issue.key}")
        return ""

    def _extract_field_value(self, value) -> str:
        """
        Extract string value from various Jira field value types.
        Handles: strings, dicts, PropertyHolder objects, and lists thereof.
        """
        if value is None:
            return ""
        
        # Plain string
        if isinstance(value, str):
            return value
        
        # List of items (PropertyHolder objects or dicts)
        if isinstance(value, list):
            texts = []
            for item in value:
                item_text = self._extract_single_item(item)
                if item_text:
                    texts.append(item_text)
            return "\n".join(texts) if texts else ""
        
        # Single item (dict or object)
        return self._extract_single_item(value)

    def _extract_single_item(self, item) -> str:
        """
        Extract text from a single Jira field item (dict or PropertyHolder object).
        """
        if item is None:
            return ""
        
        if isinstance(item, str):
            return item
        
        # Atlassian Document Format (ADF) - dict with 'content'
        if isinstance(item, dict):
            if 'content' in item:
                return self._adf_to_text(item)
            if 'value' in item:
                return str(item['value'])
            # Try to get any text-like field
            for key in ['text', 'body', 'name', 'description']:
                if key in item and item[key]:
                    return str(item[key])
        
        # PropertyHolder or similar object - try common attributes
        if hasattr(item, 'value') and item.value:
            val = item.value
            if isinstance(val, str):
                return val
            elif isinstance(val, dict) and 'content' in val:
                return self._adf_to_text(val)
        
        if hasattr(item, 'content') and item.content:
            content = item.content
            if isinstance(content, str):
                return content
            elif isinstance(content, list):
                return self._adf_to_text({'content': content})
        
        if hasattr(item, 'body') and item.body:
            return str(item.body)
        
        if hasattr(item, 'text') and item.text:
            return str(item.text)
        
        if hasattr(item, 'name') and item.name:
            return str(item.name)
        
        # Last resort: string representation (but filter out object representations)
        try:
            result = str(item)
            # Skip Python object representations like <jira.resources.PropertyHolder...>
            if result and not result.startswith('<') and result != 'None':
                return result
        except:
            pass
        
        return ""

    def _adf_to_text(self, adf_doc: Dict) -> str:
        """
        Convert Atlassian Document Format (ADF) to plain text.
        This is a simplified converter for common cases.
        """
        if not adf_doc or not isinstance(adf_doc, dict):
            return ""
        
        result = []
        content = adf_doc.get('content', [])
        
        for block in content:
            block_type = block.get('type', '')
            if block_type == 'paragraph':
                para_text = self._extract_adf_text(block.get('content', []))
                if para_text:
                    result.append(para_text)
            elif block_type in ('bulletList', 'orderedList'):
                for item in block.get('content', []):
                    item_text = self._extract_adf_text(item.get('content', []))
                    if item_text:
                        result.append(f"• {item_text}")
            elif block_type == 'heading':
                heading_text = self._extract_adf_text(block.get('content', []))
                if heading_text:
                    result.append(f"## {heading_text}")
        
        return "\n".join(result)

    def _extract_adf_text(self, content_list: List) -> str:
        """Extract text from ADF content list."""
        texts = []
        for item in content_list:
            if isinstance(item, dict):
                if item.get('type') == 'text':
                    texts.append(item.get('text', ''))
                elif 'content' in item:
                    texts.append(self._extract_adf_text(item['content']))
        return ''.join(texts)

    def _extract_comment_images(self, comments: List[Dict], attachments: List[Dict]) -> List[Dict]:
        """
        Extract image references from comment bodies.
        Supports:
        - Jira Wiki Markup: !filename.png! or !filename.png|thumbnail!
        - HTML img tags: <img src="...filename.png...">
        """
        comment_images = []
        
        # Build a lookup map: lowercase filename -> attachment data
        attachment_map = {a['filename'].lower(): a for a in attachments}
        
        # Regex patterns
        # Wiki markup: !filename.ext! or !filename.ext|options!
        wiki_pattern = re.compile(r'!([^!\s|]+\.(?:png|jpg|jpeg|gif|bmp|webp))(?:\|[^!]+)?!', re.IGNORECASE)
        # HTML img src attribute
        html_pattern = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)
        
        found_filenames = set()
        
        for comment in comments:
            body = comment.get('body', '') or ''
            
            # Match Wiki markup
            wiki_matches = wiki_pattern.findall(body)
            for filename in wiki_matches:
                found_filenames.add(filename.lower())
            
            # Match HTML img tags
            html_matches = html_pattern.findall(body)
            for src in html_matches:
                # Extract filename from URL path
                if '/' in src:
                    filename = src.split('/')[-1]
                else:
                    filename = src
                # Remove query parameters if any
                if '?' in filename:
                    filename = filename.split('?')[0]
                if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp')):
                    found_filenames.add(filename.lower())
        
        # Match found filenames against attachments
        for filename in found_filenames:
            if filename in attachment_map:
                comment_images.append(attachment_map[filename])
        
        return comment_images

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
