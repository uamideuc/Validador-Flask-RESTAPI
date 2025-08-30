"""
Authentication routes for institutional access control
Implements session-based authentication with institutional key
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models.session_model import SessionManager
from app.models.database import db_manager
from datetime import timedelta
import os

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def get_session_manager():
    """Get SessionManager instance"""
    return SessionManager(db_manager.db_path)


@bp.route('/institutional-login', methods=['POST'])
def institutional_login():
    """
    Login with institutional access key - creates unique session
    
    Request JSON:
    {
        "access_key": "institutional-key"
    }
    
    Response:
    {
        "success": true,
        "access_token": "jwt-token",
        "session_id": "sess_...",
        "expires_in": 86400,
        "message": "Session created successfully"
    }
    """
    try:
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Se requiere contenido JSON',
                'error_code': 'INVALID_CONTENT_TYPE'
            }), 400
        
        data = request.get_json()
        access_key = data.get('access_key')
        
        if not access_key:
            return jsonify({
                'success': False,
                'error': 'Clave de acceso requerida',
                'error_code': 'MISSING_ACCESS_KEY'
            }), 400
        
        # Validate access key length (basic security check)
        if len(access_key.strip()) < 4:
            return jsonify({
                'success': False,
                'error': 'Clave de acceso inválida',
                'error_code': 'INVALID_ACCESS_KEY'
            }), 401
        
        session_manager = get_session_manager()
        
        # Validate institutional key
        if not session_manager.validate_institutional_key(access_key):
            return jsonify({
                'success': False,
                'error': 'Clave de acceso inválida. Contacte al administrador para obtener la clave institucional.',
                'error_code': 'INVALID_ACCESS_KEY'
            }), 401
        
        # Get client information
        client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        user_agent = request.headers.get('User-Agent', 'Unknown')
        
        # Create new session (24 hour duration)
        session_id = session_manager.create_session(
            client_ip=client_ip,
            user_agent=user_agent,
            session_duration_hours=24
        )
        
        # Create JWT token with session_id as identity
        access_token = create_access_token(
            identity=session_id,
            expires_delta=timedelta(hours=24)
        )
        
        return jsonify({
            'success': True,
            'access_token': access_token,
            'session_id': session_id,
            'expires_in': 86400,  # 24 hours in seconds
            'message': 'Sesión iniciada exitosamente'
        }), 200
        
    except Exception as e:
        # Log the error for debugging but don't expose internal details
        print(f"Login error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Error interno del servidor',
            'error_code': 'INTERNAL_ERROR'
        }), 500


@bp.route('/session-info', methods=['GET'])
@jwt_required()
def get_session_info():
    """
    Get information about the current session
    
    Requires: Authorization: Bearer <jwt-token>
    
    Response:
    {
        "success": true,
        "session": {
            "session_id": "sess_...",
            "created_at": "2024-08-24T10:30:00",
            "expires_at": "2024-08-25T10:30:00",
            "last_activity": "2024-08-24T15:45:30"
        }
    }
    """
    try:
        current_session_id = get_jwt_identity()
        session_manager = get_session_manager()
        
        # Validate session is still active
        if not session_manager.validate_session(current_session_id):
            return jsonify({
                'success': False,
                'error': 'Sesión expirada o inválida',
                'error_code': 'SESSION_EXPIRED'
            }), 401
        
        session_info = session_manager.get_session_info(current_session_id)
        
        if not session_info:
            return jsonify({
                'success': False,
                'error': 'Sesión no encontrada',
                'error_code': 'SESSION_NOT_FOUND'
            }), 404
        
        # Return safe session information (exclude sensitive data)
        safe_info = {
            'session_id': session_info['session_id'],
            'created_at': session_info['created_at'],
            'expires_at': session_info['expires_at'],
            'last_activity': session_info['last_activity'],
            'is_active': bool(session_info['is_active'])
        }
        
        return jsonify({
            'success': True,
            'session': safe_info
        }), 200
        
    except Exception as e:
        print(f"Session info error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Error interno del servidor',
            'error_code': 'INTERNAL_ERROR'
        }), 500


@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Logout current session - invalidates session on server
    
    Requires: Authorization: Bearer <jwt-token>
    
    Response:
    {
        "success": true,
        "message": "Session closed successfully"
    }
    """
    try:
        current_session_id = get_jwt_identity()
        session_manager = get_session_manager()
        
        # Invalidate session
        success = session_manager.invalidate_session(current_session_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Sesión cerrada exitosamente'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Sesión no encontrada',
                'error_code': 'SESSION_NOT_FOUND'
            }), 404
        
    except Exception as e:
        print(f"Logout error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Error interno del servidor',
            'error_code': 'INTERNAL_ERROR'
        }), 500


@bp.route('/extend-session', methods=['POST'])
@jwt_required()
def extend_session():
    """
    Extend current session by 24 hours
    
    Requires: Authorization: Bearer <jwt-token>
    
    Response:
    {
        "success": true,
        "message": "Session extended successfully",
        "new_expires_at": "2024-08-26T10:30:00"
    }
    """
    try:
        current_session_id = get_jwt_identity()
        session_manager = get_session_manager()
        
        # Extend session
        success = session_manager.extend_session(current_session_id, additional_hours=24)
        
        if success:
            # Get updated session info
            session_info = session_manager.get_session_info(current_session_id)
            return jsonify({
                'success': True,
                'message': 'Sesión extendida exitosamente',
                'new_expires_at': session_info['expires_at']
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'No se pudo extender la sesión',
                'error_code': 'SESSION_EXTEND_FAILED'
            }), 400
        
    except Exception as e:
        print(f"Extend session error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Error interno del servidor',
            'error_code': 'INTERNAL_ERROR'
        }), 500


# ADMINISTRATIVE ENDPOINTS
@bp.route('/admin/sessions', methods=['GET'])
@jwt_required()
def get_active_sessions():
    """
    Administrative endpoint to get session statistics
    
    Requires: Authorization: Bearer <jwt-token>
    
    Response:
    {
        "success": true,
        "stats": {
            "active_sessions": 5,
            "sessions_created_today": 12,
            "expired_sessions_needing_cleanup": 3,
            "sessions_expiring_in_1_hour": 2
        }
    }
    """
    try:
        session_manager = get_session_manager()
        
        # Validate current session
        current_session_id = get_jwt_identity()
        if not session_manager.validate_session(current_session_id):
            return jsonify({
                'success': False,
                'error': 'Sesión expirada o inválida',
                'error_code': 'SESSION_EXPIRED'
            }), 401
        
        stats = session_manager.get_session_stats()
        
        return jsonify({
            'success': True,
            'stats': stats
        }), 200
        
    except Exception as e:
        print(f"Admin sessions error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Error interno del servidor',
            'error_code': 'INTERNAL_ERROR'
        }), 500


@bp.route('/admin/cleanup', methods=['POST'])
@jwt_required()
def cleanup_sessions():
    """
    Administrative endpoint to manually cleanup expired sessions
    
    Requires: Authorization: Bearer <jwt-token>
    
    Response:
    {
        "success": true,
        "cleaned_sessions": 5,
        "message": "5 expired sessions removed"
    }
    """
    try:
        session_manager = get_session_manager()
        
        # Validate current session
        current_session_id = get_jwt_identity()
        if not session_manager.validate_session(current_session_id):
            return jsonify({
                'success': False,
                'error': 'Sesión expirada o inválida',
                'error_code': 'SESSION_EXPIRED'
            }), 401
        
        cleaned_count = session_manager.cleanup_expired_sessions()
        
        return jsonify({
            'success': True,
            'cleaned_sessions': cleaned_count,
            'message': f'Se eliminaron {cleaned_count} sesiones expiradas'
        }), 200
        
    except Exception as e:
        print(f"Admin cleanup error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Error interno del servidor',
            'error_code': 'INTERNAL_ERROR'
        }), 500


@bp.route('/health', methods=['GET'])
def auth_health():
    """
    Health check endpoint for authentication service
    
    Response:
    {
        "status": "healthy",
        "service": "authentication",
        "institutional_key_configured": true
    }
    """
    try:
        # Check if institutional key is configured
        institutional_key_configured = bool(os.environ.get('INSTITUTIONAL_ACCESS_KEY'))
        
        return jsonify({
            'status': 'healthy',
            'service': 'authentication',
            'institutional_key_configured': institutional_key_configured
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'service': 'authentication',
            'error': str(e)
        }), 500