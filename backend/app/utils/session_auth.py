"""
Session-based Authorization Utilities
Provides decorators and helpers for session ownership validation
"""
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from flask import jsonify
from app.models.database import db_manager
from app.models.session_model import SessionManager
from typing import Optional


def get_current_session_id() -> Optional[str]:
    """
    Helper function to get current session_id from JWT token
    
    Returns:
        str or None: Current session ID if authenticated, None otherwise
    """
    try:
        return get_jwt_identity()
    except:
        return None


def require_session_ownership(resource_type: str = 'upload'):
    """
    Decorator to validate session ownership of resources
    
    Validates that:
    1. User has a valid JWT token
    2. Session is still active in database
    3. User owns the requested resource
    
    Args:
        resource_type: Type of resource to validate ('upload', 'validation_session', 'export')
    
    Usage:
        @bp.route('/files/<int:upload_id>')
        @require_session_ownership('upload')
        def get_file(upload_id):
            # Function will only execute if user owns the upload
            pass
    """
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            current_session_id = get_jwt_identity()
            
            # Validate that session is still active
            session_manager = SessionManager(db_manager.db_path)
            if not session_manager.validate_session(current_session_id):
                return jsonify({
                    'success': False,
                    'error': 'Su sesión ha expirado. Por favor, ingrese nuevamente su clave institucional.',
                    'error_code': 'SESSION_EXPIRED',
                    'user_message': 'Su sesión ha expirado. Será redirigido a la página de ingreso.'
                }), 401
            
            # Validate ownership based on resource type
            if resource_type == 'upload':
                upload_id = kwargs.get('upload_id')
                if upload_id:
                    upload = db_manager.get_upload_record(upload_id)
                    if not upload or upload.get('session_id') != current_session_id:
                        return jsonify({
                            'success': False,
                            'error': 'Archivo no encontrado o acceso no autorizado',
                            'error_code': 'RESOURCE_NOT_FOUND'
                        }), 404
            
            elif resource_type == 'validation_session':
                validation_session_id = kwargs.get('session_id')
                if validation_session_id:
                    validation_session = db_manager.get_validation_session(validation_session_id)
                    if not validation_session or validation_session.get('session_id') != current_session_id:
                        return jsonify({
                            'success': False,
                            'error': 'Sesión de validación no encontrada o acceso no autorizado',
                            'error_code': 'VALIDATION_SESSION_NOT_FOUND'
                        }), 404
            
            elif resource_type == 'export':
                export_id = kwargs.get('export_id')
                if export_id:
                    export_record = db_manager.get_export_record(export_id)
                    if not export_record or export_record.get('session_id') != current_session_id:
                        return jsonify({
                            'success': False,
                            'error': 'Archivo de exportación no encontrado o acceso no autorizado',
                            'error_code': 'EXPORT_NOT_FOUND'
                        }), 404
            
            # If we get here, ownership is validated
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def require_valid_session():
    """
    Simple decorator that only validates the session is active
    Use this for endpoints that don't need resource ownership validation
    
    Usage:
        @bp.route('/user/profile')
        @require_valid_session()
        def get_profile():
            # Function will only execute if session is valid
            pass
    """
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            current_session_id = get_jwt_identity()
            
            # Validate session is still active
            session_manager = SessionManager(db_manager.db_path)
            if not session_manager.validate_session(current_session_id):
                return jsonify({
                    'success': False,
                    'error': 'Su sesión ha expirado. Por favor, ingrese nuevamente su clave institucional.',
                    'error_code': 'SESSION_EXPIRED',
                    'user_message': 'Su sesión ha expirado. Será redirigido a la página de ingreso.'
                }), 401
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def get_user_resources_count(session_id: str) -> dict:
    """
    Get count of resources owned by a session
    
    Args:
        session_id: Session ID to count resources for
        
    Returns:
        dict: Count of resources by type
    """
    try:
        # Get counts from database
        upload_count = db_manager.get_user_uploads_count(session_id)
        validation_count = db_manager.get_user_validations_count(session_id)
        export_count = db_manager.get_user_exports_count(session_id)
        
        return {
            'uploads': upload_count,
            'validations': validation_count,
            'exports': export_count,
            'total': upload_count + validation_count + export_count
        }
    except Exception as e:
        print(f"Error getting resource counts for session {session_id}: {str(e)}")
        return {'uploads': 0, 'validations': 0, 'exports': 0, 'total': 0}


def validate_session_access(session_id: str, resource_id: int, resource_type: str) -> bool:
    """
    Validate if a session has access to a specific resource
    
    Args:
        session_id: Session ID to validate
        resource_id: ID of the resource
        resource_type: Type of resource ('upload', 'validation_session', 'export')
        
    Returns:
        bool: True if session has access, False otherwise
    """
    try:
        if resource_type == 'upload':
            upload = db_manager.get_upload_record(resource_id)
            return upload and upload.get('session_id') == session_id
            
        elif resource_type == 'validation_session':
            validation = db_manager.get_validation_session(resource_id)
            return validation and validation.get('session_id') == session_id
            
        elif resource_type == 'export':
            export = db_manager.get_export_record(resource_id)
            return export and export.get('session_id') == session_id
            
        return False
        
    except Exception as e:
        print(f"Error validating session access: {str(e)}")
        return False


def cleanup_session_data(session_id: str) -> dict:
    """
    Clean up all data associated with a session when it expires
    
    Args:
        session_id: Session ID to clean up
        
    Returns:
        dict: Statistics of cleaned up data
    """
    try:
        # This will be implemented after database updates
        # For now, return placeholder
        return {
            'uploads_deleted': 0,
            'validations_deleted': 0,
            'exports_deleted': 0,
            'files_deleted': 0
        }
    except Exception as e:
        print(f"Error cleaning up session data for {session_id}: {str(e)}")
        return {'error': str(e)}


class SessionContext:
    """
    Context manager for session operations
    Provides easy access to current session information
    """
    
    def __init__(self):
        self.session_id = None
        self.session_info = None
        self.session_manager = None
    
    def __enter__(self):
        try:
            self.session_id = get_jwt_identity()
            if self.session_id:
                self.session_manager = SessionManager(db_manager.db_path)
                self.session_info = self.session_manager.get_session_info(self.session_id)
        except:
            pass
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        pass
    
    def is_valid(self) -> bool:
        """Check if current session is valid"""
        if not self.session_id or not self.session_manager:
            return False
        return self.session_manager.validate_session(self.session_id)
    
    def get_session_id(self) -> Optional[str]:
        """Get current session ID"""
        return self.session_id
    
    def get_session_info(self) -> Optional[dict]:
        """Get current session information"""
        return self.session_info