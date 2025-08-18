"""
Basic application tests
"""
import pytest
from app import create_app

@pytest.fixture
def app():
    """Create application for testing"""
    app = create_app()
    app.config['TESTING'] = True
    return app

@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()

def test_app_creation(app):
    """Test that app is created successfully"""
    assert app is not None
    assert app.config['TESTING'] is True

def test_file_routes_exist(client):
    """Test that file routes are registered"""
    response = client.post('/api/files/upload')
    assert response.status_code in [200, 405, 400]  # Route exists

def test_validation_routes_exist(client):
    """Test that validation routes are registered"""
    response = client.post('/api/validation/run')
    assert response.status_code in [200, 405, 400]  # Route exists

def test_export_routes_exist(client):
    """Test that export routes are registered"""
    response = client.post('/api/export/normalized')
    assert response.status_code in [200, 405, 400]  # Route exists