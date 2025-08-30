"""
Tool runner API - Delegates execution to the tools layer
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..core.services.security_service import require_session_ownership
from ..core.database import DatabaseManager
from ..core.models import VariableCategorization
from ..tools import get_toolkit, get_available_tools
import pandas as pd
import json
import os

bp = Blueprint('tool_runner', __name__, url_prefix='/api/tools')

def get_db_manager():
    """Get database manager instance"""
    if current_app.config.get('TESTING'):
        db_path = current_app.config.get('DATABASE_PATH', 'test.db')
        return DatabaseManager(db_path)
    else:
        from ..core.database import db_manager
        return db_manager

@bp.route('/available', methods=['GET'])
@jwt_required()
def list_available_tools():
    """List all available tools"""
    try:
        tools = get_available_tools()
        return jsonify({
            'success': True,
            'tools': tools
        })
    except Exception as e:
        current_app.logger.error(f'Error listing tools: {e}')
        return jsonify({
            'success': False,
            'error': 'Error obteniendo herramientas disponibles'
        }), 500

@bp.route('/<tool_name>/run', methods=['POST'])
@jwt_required()
@require_session_ownership
def run_tool_validation(tool_name):
    """Run validation using specified tool"""
    try:
        session_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'session_id' not in data:
            return jsonify({
                'success': False,
                'error': 'session_id requerido'
            }), 400
        
        validation_session_id = data['session_id']
        
        # Get validation session from database
        db = get_db_manager()
        validation_session = db.get_validation_session(validation_session_id)
        
        if not validation_session:
            return jsonify({
                'success': False,
                'error': 'Sesión de validación no encontrada'
            }), 404
        
        if validation_session.session_id != session_id:
            return jsonify({
                'success': False,
                'error': 'Sin permisos para acceder a esta sesión'
            }), 403
        
        # Load data from file
        file_path = validation_session.file_path
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'Archivo no encontrado'
            }), 404
        
        # Load file data
        if file_path.endswith('.csv'):
            data_df = pd.read_csv(file_path)
        else:
            data_df = pd.read_excel(file_path)
        
        # Parse categorization
        categorization_dict = json.loads(validation_session.categorization)
        categorization = VariableCategorization(**categorization_dict)
        
        # Get and initialize toolkit
        toolkit = get_toolkit(tool_name, session_id)
        if not toolkit:
            return jsonify({
                'success': False,
                'error': f'Herramienta {tool_name} no encontrada'
            }), 404
        
        # Initialize toolkit
        init_result = toolkit.initialize(data_df, categorization)
        if not init_result['success']:
            return jsonify({
                'success': False,
                'error': f'Error inicializando herramienta: {init_result.get("message", "Error desconocido")}'
            }), 500
        
        # Run validation
        validation_report = toolkit.run_validation()
        
        # Save validation results to database
        db.update_validation_results(validation_session_id, validation_report.__dict__)
        
        return jsonify({
            'success': True,
            'validation_report': validation_report.__dict__,
            'session_id': validation_session_id
        })
        
    except Exception as e:
        current_app.logger.error(f'Error running tool {tool_name}: {e}')
        return jsonify({
            'success': False,
            'error': f'Error ejecutando herramienta: {str(e)}'
        }), 500

@bp.route('/<tool_name>/export', methods=['POST'])
@jwt_required()
@require_session_ownership
def export_tool_data(tool_name):
    """Export data using specified tool"""
    try:
        session_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'validation_session_id' not in data or 'export_type' not in data:
            return jsonify({
                'success': False,
                'error': 'validation_session_id y export_type requeridos'
            }), 400
        
        validation_session_id = data['validation_session_id']
        export_type = data['export_type']
        
        # Get validation session
        db = get_db_manager()
        validation_session = db.get_validation_session(validation_session_id)
        
        if not validation_session:
            return jsonify({
                'success': False,
                'error': 'Sesión de validación no encontrada'
            }), 404
        
        if validation_session.session_id != session_id:
            return jsonify({
                'success': False,
                'error': 'Sin permisos para acceder a esta sesión'
            }), 403
        
        # Load data
        file_path = validation_session.file_path
        if file_path.endswith('.csv'):
            data_df = pd.read_csv(file_path)
        else:
            data_df = pd.read_excel(file_path)
        
        # Parse categorization
        categorization_dict = json.loads(validation_session.categorization)
        categorization = VariableCategorization(**categorization_dict)
        
        # Get and initialize toolkit
        toolkit = get_toolkit(tool_name, session_id)
        if not toolkit:
            return jsonify({
                'success': False,
                'error': f'Herramienta {tool_name} no encontrada'
            }), 404
        
        toolkit.initialize(data_df, categorization)
        
        # Execute export
        export_result = toolkit.export_data(export_type, validation_session_id)
        
        return jsonify(export_result)
        
    except Exception as e:
        current_app.logger.error(f'Error exporting with tool {tool_name}: {e}')
        return jsonify({
            'success': False,
            'error': f'Error exportando datos: {str(e)}'
        }), 500

@bp.route('/<tool_name>/metadata', methods=['GET'])
@jwt_required()
def get_tool_metadata(tool_name):
    """Get metadata for specified tool"""
    try:
        session_id = get_jwt_identity()
        toolkit = get_toolkit(tool_name, session_id)
        
        if not toolkit:
            return jsonify({
                'success': False,
                'error': f'Herramienta {tool_name} no encontrada'
            }), 404
        
        metadata = toolkit.get_metadata()
        return jsonify({
            'success': True,
            'metadata': metadata
        })
        
    except Exception as e:
        current_app.logger.error(f'Error getting metadata for tool {tool_name}: {e}')
        return jsonify({
            'success': False,
            'error': f'Error obteniendo metadata: {str(e)}'
        }), 500