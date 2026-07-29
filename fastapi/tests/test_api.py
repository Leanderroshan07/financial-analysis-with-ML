"""
Automated tests for FastAPI AI Financial Purchase Advisor API.
Tests cover all endpoints, validation, error handling, and response schemas.
"""

import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import sys
import json

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.main import app


VALID_REQUEST = {
    'total_income': 75000,
    'total_fixed_expense': 25000,
    'total_variable_expense': 15000,
    'current_savings': 30000,
    'emergency_fund': 20000,
    'emergency_usage_limit': 50,
    'purchase_price': 15000
}

INVALID_REQUEST_NEGATIVE = {
    'total_income': 75000,
    'total_fixed_expense': -1000,
    'total_variable_expense': 15000,
    'current_savings': 30000,
    'emergency_fund': 20000,
    'emergency_usage_limit': 50,
    'purchase_price': 15000
}

INVALID_REQUEST_EMERGENCY_LIMIT = {
    'total_income': 75000,
    'total_fixed_expense': 25000,
    'total_variable_expense': 15000,
    'current_savings': 30000,
    'emergency_fund': 20000,
    'emergency_usage_limit': 55,
    'purchase_price': 15000
}

INVALID_REQUEST_MISSING = {
    'total_income': 75000,
    'total_fixed_expense': 25000,
    'current_savings': 30000,
}

HIGH_PURCHASE_REQUEST = {
    'total_income': 50000,
    'total_fixed_expense': 35000,
    'total_variable_expense': 15000,
    'current_savings': 5000,
    'emergency_fund': 3000,
    'emergency_usage_limit': 30,
    'purchase_price': 50000
}


@pytest.fixture(scope='module')
def client():
    with TestClient(app) as c:
        yield c


class TestHealthEndpoint:
    def test_health_check(self, client):
        response = client.get('/api/v1/health')
        assert response.status_code == 200
        data = response.json()
        assert 'status' in data
        assert 'service' in data
        assert 'version' in data
        assert 'uptime_seconds' in data
        assert 'models_loaded' in data
        assert 'pipeline_ready' in data


class TestVersionEndpoint:
    def test_version(self, client):
        response = client.get('/api/v1/version')
        assert response.status_code == 200
        data = response.json()
        assert 'api_version' in data
        assert 'pipeline_version' in data
        assert 'model_versions' in data


class TestModelInfoEndpoint:
    def test_model_info(self, client):
        response = client.get('/api/v1/model-info')
        assert response.status_code == 200
        data = response.json()
        assert 'recommendation_model' in data
        assert 'pattern_model' in data
        assert 'feature_count' in data
        assert 'dataset_version' in data
        assert 'pipeline_version' in data


class TestFeaturesEndpoint:
    def test_features(self, client):
        response = client.get('/api/v1/features')
        assert response.status_code == 200
        data = response.json()
        assert 'required_inputs' in data
        assert 'engineered_features' in data
        assert 'model_input_features' in data
        assert len(data['required_inputs']) == 7


class TestPredictionEndpoint:
    def test_prediction_valid(self, client):
        response = client.post('/api/v1/predict', json=VALID_REQUEST)
        assert response.status_code == 200
        data = response.json()
        assert data['recommendation'] in ['YES', 'NO']
        assert data['pattern'] in ['P1', 'P2', 'P3', 'P4', 'P6']
        assert 'confidence' in data
        assert 'recommendation_probability' in data
        assert 'pattern_probability' in data
        assert 'funding_strategy' in data
        assert 'financial_summary' in data
        assert 'engineered_features' in data
        assert 'business_explanation' in data
        assert 'suggestions' in data
        assert 'processing_time_ms' in data
        assert 'model_version' in data

    def test_prediction_response_schema(self, client):
        response = client.post('/api/v1/predict', json=VALID_REQUEST)
        assert response.status_code == 200
        data = response.json()
        assert 'savings_used' in data['funding_strategy']
        assert 'remaining_balance_used' in data['funding_strategy']
        assert 'emergency_used' in data['funding_strategy']
        assert 'recommendation' in data['confidence']
        assert 'pattern' in data['confidence']
        assert 'yes' in data['recommendation_probability']
        assert 'no' in data['recommendation_probability']
        assert isinstance(data['suggestions'], list)
        assert len(data['suggestions']) > 0

    def test_prediction_not_affordable(self, client):
        response = client.post('/api/v1/predict', json=HIGH_PURCHASE_REQUEST)
        assert response.status_code == 200
        data = response.json()
        if data['recommendation'] == 'NO':
            assert data['pattern'] == 'P6'

    def test_prediction_negative_values(self, client):
        response = client.post('/api/v1/predict', json=INVALID_REQUEST_NEGATIVE)
        assert response.status_code == 422

    def test_prediction_invalid_emergency_limit(self, client):
        response = client.post('/api/v1/predict', json=INVALID_REQUEST_EMERGENCY_LIMIT)
        assert response.status_code == 422

    def test_prediction_missing_fields(self, client):
        response = client.post('/api/v1/predict', json=INVALID_REQUEST_MISSING)
        assert response.status_code == 422

    def test_prediction_engineered_features(self, client):
        response = client.post('/api/v1/predict', json=VALID_REQUEST)
        assert response.status_code == 200
        data = response.json()
        ef = data['engineered_features']
        assert 'total_expense' in ef
        assert 'remaining_balance' in ef
        assert 'disposable_income' in ef
        assert 'emergency_available' in ef
        assert 'available_money' in ef
        assert 'expense_ratio' in ef
        assert 'savings_ratio' in ef
        assert 'purchase_ratio' in ef
        assert 'financial_health_score' in ef


class TestBatchPredictionEndpoint:
    def test_batch_prediction(self, client):
        payload = {'requests': [VALID_REQUEST, HIGH_PURCHASE_REQUEST]}
        response = client.post('/api/v1/batch-predict', json=payload)
        assert response.status_code == 200
        data = response.json()
        assert 'predictions' in data
        assert 'total_processed' in data
        assert 'average_time_ms' in data
        assert data['total_processed'] == 2
        assert len(data['predictions']) == 2

    def test_batch_empty(self, client):
        response = client.post('/api/v1/batch-predict', json={'requests': []})
        assert response.status_code == 422

    def test_batch_too_many(self, client):
        many_requests = [VALID_REQUEST] * 101
        response = client.post('/api/v1/batch-predict', json={'requests': many_requests})
        assert response.status_code == 422


class TestRootEndpoint:
    def test_root(self, client):
        response = client.get('/')
        assert response.status_code == 200
        data = response.json()
        assert 'service' in data
        assert 'version' in data


class TestSwaggerDocs:
    def test_swagger_ui(self, client):
        response = client.get('/docs')
        assert response.status_code == 200
        assert 'text/html' in response.headers.get('content-type', '')

    def test_openapi_json(self, client):
        response = client.get('/openapi.json')
        assert response.status_code == 200
        schema = response.json()
        assert 'paths' in schema
        assert '/api/v1/predict' in schema['paths']
        assert '/api/v1/batch-predict' in schema['paths']
        assert '/api/v1/health' in schema['paths']
        assert '/api/v1/model-info' in schema['paths']
        assert '/api/v1/version' in schema['paths']
        assert '/api/v1/features' in schema['paths']

    def test_redoc(self, client):
        response = client.get('/redoc')
        assert response.status_code == 200
        assert 'text/html' in response.headers.get('content-type', '')
