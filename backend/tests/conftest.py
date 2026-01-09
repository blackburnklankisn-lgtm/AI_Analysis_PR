# Pytest configuration for Jira AI Diagnostic Tool
import pytest
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def pytest_configure(config):
    """Configure custom markers and test environment."""
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests (require external services)"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests (no external dependencies)"
    )

@pytest.fixture(scope="session")
def test_config():
    """Provide test configuration from environment variables."""
    return {
        "gemini_api_key": os.getenv("TEST_GEMINI_API_KEY", ""),
        "customer_username": os.getenv("TEST_CUSTOMER_USERNAME", "qiaoye.li"),
        "customer_password": os.getenv("TEST_CUSTOMER_PASSWORD", ""),
        "customer_jira_url": os.getenv("TEST_CUSTOMER_JIRA_URL", "https://jira.gacrnd.com:8443"),
        "internal_username": os.getenv("TEST_INTERNAL_USERNAME", "uie85246"),
        "internal_password": os.getenv("TEST_INTERNAL_PASSWORD", ""),
        "internal_jira_url": os.getenv("TEST_INTERNAL_JIRA_URL", "https://ix.jira.automotive.cloud"),
        "search_target": "CUSTOMER",
        "customer_project": "XH2CONTI",
        "internal_project": "CGF",
        "customer_issuetype": "BUG",
        "internal_issuetype": "Problem Report (PR)"
    }

@pytest.fixture(scope="session")
def test_issue_key():
    """Provide a known valid test issue key."""
    return os.getenv("TEST_ISSUE_KEY", "XH2CONTI-22035")
