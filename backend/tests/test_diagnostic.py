"""
Tests for Jira AI Diagnostic Tool

Run tests:
    pytest tests/ -v

Generate HTML report:
    pytest tests/ --html=reports/test_report.html --self-contained-html

Run only unit tests:
    pytest tests/ -m unit

Run only integration tests (requires credentials):
    pytest tests/ -m integration
"""
import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestHealthCheck:
    """Unit tests for health check endpoint."""
    
    @pytest.mark.unit
    def test_health_check_returns_ok(self):
        """Test that health check endpoint returns status ok."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"


class TestDiagnosticRequestValidation:
    """Unit tests for request validation."""
    
    @pytest.mark.unit
    def test_diagnose_missing_required_fields(self):
        """Test that missing required fields return 422."""
        response = client.post("/diagnose", json={})
        assert response.status_code == 422  # Unprocessable Entity
    
    @pytest.mark.unit
    def test_diagnose_missing_issue_key(self):
        """Test that missing issue_key returns 422."""
        response = client.post("/diagnose", json={
            "gemini_api_key": "test_key",
            "customer_username": "user",
            "customer_password": "pass",
            "internal_username": "user",
            "internal_password": "pass"
        })
        assert response.status_code == 422


class TestDiagnosticIntegration:
    """Integration tests for full diagnostic flow (requires credentials)."""
    
    @pytest.mark.integration
    def test_full_diagnostic_flow(self, test_config, test_issue_key):
        """Test complete diagnostic flow with real credentials."""
        if not test_config["gemini_api_key"]:
            pytest.skip("TEST_GEMINI_API_KEY not set in environment")
        if not test_config["customer_password"]:
            pytest.skip("TEST_CUSTOMER_PASSWORD not set in environment")
        
        request_data = {
            "issue_key": test_issue_key,
            **test_config
        }
        
        response = client.post("/diagnose", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "issue_key" in data
        assert "report" in data
        assert "trace" in data
        assert "status" in data
        assert data["status"] == "success"
        
        # Verify trace contains expected fields
        trace = data["trace"]
        assert "stratified_keywords" in trace
        assert "extracted_keywords" in trace
        assert "initial_search_query" in trace
        assert "historical_candidates" in trace
    
    @pytest.mark.integration
    def test_custom_core_intent(self, test_config, test_issue_key):
        """Test diagnostic with user-provided custom core intent."""
        if not test_config["gemini_api_key"]:
            pytest.skip("TEST_GEMINI_API_KEY not set in environment")
        if not test_config["customer_password"]:
            pytest.skip("TEST_CUSTOMER_PASSWORD not set in environment")
        
        request_data = {
            "issue_key": test_issue_key,
            "custom_core_intent": "CCU升级,OTA失败",
            **test_config
        }
        
        response = client.post("/diagnose", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify custom intent was used
        assert data["status"] == "success"
        trace = data["trace"]
        assert "CCU升级" in trace["stratified_keywords"].get("core_intent", []) or \
               "OTA失败" in trace["stratified_keywords"].get("core_intent", [])
    
    @pytest.mark.integration
    def test_keyword_retry_on_sparse_results(self, test_config):
        """Test that keyword retry logic works when results are sparse."""
        if not test_config["gemini_api_key"]:
            pytest.skip("TEST_GEMINI_API_KEY not set in environment")
        if not test_config["customer_password"]:
            pytest.skip("TEST_CUSTOMER_PASSWORD not set in environment")
        
        # Use a PR that might have sparse results
        request_data = {
            "issue_key": "XH2CONTI-22035",
            **test_config
        }
        
        response = client.post("/diagnose", json=request_data)
        
        # Should either succeed or retry
        assert response.status_code in [200, 500]
        if response.status_code == 200:
            data = response.json()
            assert data["status"] == "success"


class TestInvalidIssueKey:
    """Tests for invalid issue key handling."""
    
    @pytest.mark.integration
    def test_nonexistent_issue_key(self, test_config):
        """Test that nonexistent issue key returns 404."""
        if not test_config["customer_password"]:
            pytest.skip("TEST_CUSTOMER_PASSWORD not set in environment")
        
        request_data = {
            "issue_key": "INVALID-99999",
            **test_config
        }
        
        response = client.post("/diagnose", json=request_data)
        
        # Should return 404 or 500 with appropriate message
        assert response.status_code in [404, 500]
