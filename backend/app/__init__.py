"""
Validador de Instrumentos - Flask Backend
"""
from flask import Flask
from flask_cors import CORS
import os

def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
    
    # Enable CORS for frontend communication
    CORS(app)
    
    # Ensure upload directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Initialize database if not in testing mode
    if not app.config.get('TESTING'):
        from app.models.database import db_manager
        # Database is initialized automatically when imported
    
    # Register blueprints
    from app.routes import files, validation, export
    app.register_blueprint(files.bp)
    app.register_blueprint(validation.bp)
    app.register_blueprint(export.bp)
    
    # Add a simple root route
    @app.route('/')
    def index():
        return {
            'message': 'Validador de Instrumentos API',
            'version': '1.0.0',
            'status': 'running',
            'endpoints': {
                'files': '/api/files/',
                'validation': '/api/validation/',
                'export': '/api/export/'
            }
        }
    
    # Add health check endpoint
    @app.route('/health')
    def health():
        return {'status': 'healthy', 'message': 'API is running'}
    
    return app