"""
Validador de Instrumentos - Flask Backend
Secure application factory with institutional authentication
"""
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def validate_production_config():
    """
    Validate production configuration to prevent security issues
    """
    flask_env = os.environ.get('FLASK_ENV', 'development')
    
    if flask_env == 'production':
        # Check for secure keys in production
        secret_key = os.environ.get('SECRET_KEY', '')
        institutional_key = os.environ.get('INSTITUTIONAL_ACCESS_KEY', '')
        
        # Check for development keys in production (CRITICAL ERROR)
        if secret_key in ['dev-secret-key', 'dev-secret-key-change-in-production']:
            raise ValueError(
                "CRITICAL SECURITY ERROR: Using development SECRET_KEY in production! "
                "Run setup_production.sh to generate secure keys."
            )
        
        if institutional_key in ['dev-access-2024', 'test-key']:
            raise ValueError(
                "CRITICAL SECURITY ERROR: Using development INSTITUTIONAL_ACCESS_KEY in production! "
                "Run setup_production.sh to generate secure keys."
            )
        
        # Check key length requirements
        if len(secret_key) < 32:
            raise ValueError(
                "CRITICAL SECURITY ERROR: SECRET_KEY must be at least 32 characters long in production"
            )
        
        if len(institutional_key) < 16:
            raise ValueError(
                "CRITICAL SECURITY ERROR: INSTITUTIONAL_ACCESS_KEY must be at least 16 characters long"
            )
        
        # Check required production environment variables
        frontend_url = os.environ.get('FRONTEND_URL')
        if not frontend_url:
            raise ValueError(
                "CRITICAL SECURITY ERROR: FRONTEND_URL must be set in production for CORS security"
            )


def create_app():
    """
    Secure application factory with comprehensive security configuration
    """
    app = Flask(__name__)
    
    # SECURITY: Validate production configuration first
    validate_production_config()
    
    # SECURITY: Require critical environment variables
    required_env_vars = ['SECRET_KEY', 'INSTITUTIONAL_ACCESS_KEY']
    missing_vars = [var for var in required_env_vars if not os.environ.get(var)]
    
    if missing_vars:
        raise ValueError(
            f"CRITICAL ERROR: Required environment variables not set: {', '.join(missing_vars)}. "
            f"Please run setup_development.sh or setup_production.sh to configure."
        )
    
    # SECURITY: Flask configuration with secure defaults
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
    app.config['JWT_SECRET_KEY'] = os.environ.get('SECRET_KEY')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
    app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))
    
    # SECURITY: Environment-specific CORS configuration
    flask_env = os.environ.get('FLASK_ENV', 'development')
    
    if flask_env == 'production':
        # Production: Strict CORS to specific domain only
        production_url = os.environ.get('FRONTEND_URL')
        if not production_url:
            raise ValueError("FRONTEND_URL must be set in production")
        
        CORS(app, origins=[production_url], supports_credentials=True)
        print(f"🔒 Production CORS configured for: {production_url}")
        
    else:
        # Development: Allow localhost origins
        development_origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            os.environ.get('FRONTEND_URL', '')
        ]
        CORS(app, origins=[url for url in development_origins if url], supports_credentials=True)
        print(f"🚧 Development CORS configured for: {development_origins}")
    
    # SECURITY: Initialize JWT Manager
    jwt = JWTManager(app)
    
    # JWT Error Handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {
            'success': False,
            'error': 'Token has expired. Please login again.',
            'error_code': 'TOKEN_EXPIRED'
        }, 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {
            'success': False,
            'error': 'Invalid token. Please login again.',
            'error_code': 'INVALID_TOKEN'
        }, 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {
            'success': False,
            'error': 'Acceso denegado. Es necesario ingresar la clave institucional.',
            'error_code': 'TOKEN_REQUIRED',
            'user_message': 'Para continuar, por favor ingrese su clave institucional.'
        }, 401
    
    # SECURITY: Security headers middleware
    @app.after_request
    def add_security_headers(response):
        """Add comprehensive security headers"""
        
        # Prevent MIME type sniffing
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # Prevent clickjacking
        response.headers['X-Frame-Options'] = 'DENY'
        
        # XSS protection
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Referrer policy
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Remove server information
        response.headers['Server'] = 'Validador'
        
        if flask_env == 'production':
            # Production-only security headers
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
            response.headers['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; "
                "connect-src 'self'; "
                "font-src 'self'"
            )
        
        return response
    
    # SECURITY: Request logging for monitoring
    @app.before_request
    def log_request_info():
        """Log request information for security monitoring"""
        from flask import request
        
        # Log suspicious requests to root (but ignore Steam)
        if request.path == '/' and request.method == 'POST':
            user_agent = request.headers.get('User-Agent', '')
            if 'Valve/Steam' not in user_agent:
                print(f"🚨 SUSPICIOUS REQUEST: {request.method} {request.path} from {request.remote_addr}")
                print(f"   Headers: {dict(request.headers)}")
                print(f"   User-Agent: {user_agent}")
                print(f"   Content-Type: {request.headers.get('Content-Type', 'N/A')}")
        
        if flask_env == 'production':
            # In production, log security-relevant requests
            if request.endpoint in ['auth.institutional_login', 'files.upload_file']:
                print(f"🔍 {request.method} {request.path} from {request.remote_addr}")
    
    # Create upload directory with secure permissions
    upload_folder = app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)
    
    # Set secure permissions on upload directory
    try:
        os.chmod(upload_folder, 0o750)  # Owner: rwx, Group: r-x, Others: none
    except:
        pass  # Windows might not support chmod
    
    # SECURITY: Initialize database if not in testing mode
    if not app.config.get('TESTING'):
        try:
            from app.models.database import db_manager
            from app.models.session_model import SessionManager
            
            # Test database connection and session management
            session_manager = SessionManager(db_manager.db_path)
            print("✅ Database and session management initialized successfully")
            
        except Exception as e:
            print(f"❌ Database initialization error: {str(e)}")
            if flask_env == 'production':
                raise e  # Fail fast in production
    
    # SECURITY: Register blueprints with authentication
    from app.routes import files, validation, export, auth
    
    # Authentication routes (must be registered first)
    app.register_blueprint(auth.bp)
    
    # Application routes (protected by authentication)
    app.register_blueprint(files.bp)
    app.register_blueprint(validation.bp)
    app.register_blueprint(export.bp)
    
    # SECURITY: Initialize automatic cleanup scheduler
    if not app.config.get('TESTING'):
        try:
            from app.utils.cleanup_scheduler import start_cleanup_scheduler
            start_cleanup_scheduler()
            print("✅ Automatic cleanup scheduler started")
        except ImportError:
            print("⚠️  Cleanup scheduler not available - create cleanup_scheduler.py")
    
    # SECURITY: Secure root route with environment info
    @app.route('/')
    def index():
        """Root endpoint with security-conscious information disclosure"""
        return {
            'service': 'Validador de Instrumentos API',
            'version': '2.0.0-secure',
            'status': 'running',
            'environment': flask_env,
            'security_enabled': True,
            'authentication_required': True,
            'endpoints': {
                'auth': '/api/auth/',
                'files': '/api/files/',
                'validation': '/api/validation/',
                'export': '/api/export/'
            },
            'security_features': [
                'Institutional Key Authentication',
                'Session-based Authorization',
                'Automatic Data Cleanup',
                'Secure File Storage',
                'CORS Protection',
                'Security Headers'
            ]
        }
    
    # SECURITY: Enhanced health check
    @app.route('/health')
    def health():
        """Health check with security status"""
        try:
            # Test database connection
            from app.models.database import db_manager
            with db_manager.get_connection():
                db_status = 'healthy'
        except:
            db_status = 'error'
        
        # Check environment configuration
        institutional_key_configured = bool(os.environ.get('INSTITUTIONAL_ACCESS_KEY'))
        
        health_status = {
            'status': 'healthy' if db_status == 'healthy' else 'degraded',
            'timestamp': os.urandom(8).hex(),  # Random identifier for this health check
            'database': db_status,
            'authentication_configured': institutional_key_configured,
            'environment': flask_env
        }
        
        status_code = 200 if health_status['status'] == 'healthy' else 503
        return health_status, status_code
    
    # SECURITY: Error handlers that don't leak information
    @app.errorhandler(404)
    def not_found(error):
        return {
            'success': False,
            'error': 'Endpoint not found',
            'error_code': 'NOT_FOUND'
        }, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return {
            'success': False,
            'error': 'Internal server error',
            'error_code': 'INTERNAL_ERROR'
        }, 500
    
    print(f"🛡️  Validador de Instrumentos - Secure Mode Enabled")
    print(f"🌍 Environment: {flask_env}")
    print(f"🔑 Authentication: Required")
    print(f"🔒 CORS: Configured")
    print(f"⏰ Session Duration: 24 hours")
    
    return app