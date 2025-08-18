"""
File upload and parsing routes
"""
from flask import Blueprint, request, jsonify, current_app
from werkzeug.exceptions import RequestEntityTooLarge
from app.services.file_service import FileUploadService
from app.models.database import db_manager, DatabaseManager
import os

bp = Blueprint('files', __name__, url_prefix='/api/files')

def get_file_service():
    """Get file service instance"""
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    return FileUploadService(upload_folder)

def get_db_manager():
    """Get database manager instance"""
    if current_app.config.get('TESTING'):
        # For testing, create a new instance with test database
        db_path = current_app.config.get('DATABASE_PATH', 'test.db')
        return DatabaseManager(db_path)
    else:
        # For production, use the global instance
        return db_manager

@bp.route('/upload', methods=['POST'])
def upload_file():
    """Upload and process file"""
    try:
        # Check if file is present in request
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No se encontró archivo en la petición',
                'error_code': 'NO_FILE'
            }), 400
        
        file = request.files['file']
        
        # Check if file was selected
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No se seleccionó ningún archivo',
                'error_code': 'NO_FILE_SELECTED'
            }), 400
        
        # Upload file using service
        file_service = get_file_service()
        upload_result = file_service.upload_file(file)
        
        if not upload_result['success']:
            return jsonify(upload_result), 400
        
        # Create database record
        db = get_db_manager()
        upload_id = db.create_upload_record(
            filename=upload_result['original_filename'],
            file_path=upload_result['file_path'],
            file_size=upload_result['file_size']
        )
        
        # Get file info (including sheets for Excel files)
        file_info = file_service.get_file_info(upload_result['file_path'])
        
        response_data = {
            'success': True,
            'upload_id': upload_id,
            'file_id': upload_result['file_id'],
            'filename': upload_result['original_filename'],
            'file_size': upload_result['file_size'],
            'file_extension': upload_result['file_extension'],
            'is_excel': file_info['is_excel'],
            'is_csv': file_info['is_csv']
        }
        
        # Add sheet information for Excel files
        if file_info['is_excel']:
            response_data['sheet_names'] = file_info['sheet_names']
            response_data['sheet_count'] = file_info['sheet_count']
            response_data['requires_sheet_selection'] = len(file_info['sheet_names']) > 1
        
        return jsonify(response_data), 201
        
    except RequestEntityTooLarge:
        return jsonify({
            'success': False,
            'error': 'Archivo demasiado grande',
            'error_code': 'FILE_TOO_LARGE'
        }), 413
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error interno del servidor: {str(e)}',
            'error_code': 'INTERNAL_ERROR'
        }), 500

@bp.route('/<int:upload_id>/sheets', methods=['GET'])
def get_sheets(upload_id):
    """Get available sheets for Excel files"""
    try:
        # Get upload record from database
        db = get_db_manager()
        upload_record = db.get_upload_record(upload_id)
        
        if not upload_record:
            return jsonify({
                'success': False,
                'error': 'Archivo no encontrado',
                'error_code': 'FILE_NOT_FOUND'
            }), 404
        
        # Check if file still exists
        if not os.path.exists(upload_record['file_path']):
            return jsonify({
                'success': False,
                'error': 'Archivo no disponible en el servidor',
                'error_code': 'FILE_NOT_AVAILABLE'
            }), 404
        
        # Get sheet names
        file_service = get_file_service()
        sheet_names = file_service.get_sheet_names(upload_record['file_path'])
        
        return jsonify({
            'success': True,
            'upload_id': upload_id,
            'filename': upload_record['filename'],
            'sheet_names': sheet_names,
            'sheet_count': len(sheet_names),
            'is_excel': len(sheet_names) > 0
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al obtener hojas: {str(e)}',
            'error_code': 'SHEETS_ERROR'
        }), 500

@bp.route('/<int:upload_id>/parse', methods=['POST'])
def parse_file(upload_id):
    """Parse file and return variables"""
    try:
        # Get upload record from database
        db = get_db_manager()
        upload_record = db.get_upload_record(upload_id)
        
        if not upload_record:
            return jsonify({
                'success': False,
                'error': 'Archivo no encontrado',
                'error_code': 'FILE_NOT_FOUND'
            }), 404
        
        # Check if file still exists
        if not os.path.exists(upload_record['file_path']):
            return jsonify({
                'success': False,
                'error': 'Archivo no disponible en el servidor',
                'error_code': 'FILE_NOT_AVAILABLE'
            }), 404
        
        # Get sheet name from request (for Excel files)
        sheet_name = None
        if request.is_json:
            data = request.get_json()
            sheet_name = data.get('sheet_name')
        
        # Parse file
        file_service = get_file_service()
        parse_result = file_service.parse_file(upload_record['file_path'], sheet_name)
        
        if not parse_result['success']:
            return jsonify(parse_result), 400
        
        # Update database with variables and sheet name
        variables = parse_result['columns']
        db.update_upload_variables(upload_id, variables)
        
        # Update sheet name if provided
        if sheet_name:
            # We could add a method to update sheet name, for now we'll include it in response
            pass
        
        # Prepare response (exclude DataFrame from response)
        response_data = {
            'success': True,
            'upload_id': upload_id,
            'filename': upload_record['filename'],
            'variables': parse_result['columns'],
            'sample_values': parse_result['sample_values'],
            'statistics': parse_result['statistics'],
            'sheet_name': parse_result.get('sheet_name')
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al procesar archivo: {str(e)}',
            'error_code': 'PARSE_ERROR'
        }), 500

@bp.route('/<int:upload_id>/variables', methods=['GET'])
def get_variables(upload_id):
    """Get variables from previously parsed file"""
    try:
        # Get upload record from database
        db = get_db_manager()
        upload_record = db.get_upload_record(upload_id)
        
        if not upload_record:
            return jsonify({
                'success': False,
                'error': 'Archivo no encontrado',
                'error_code': 'FILE_NOT_FOUND'
            }), 404
        
        if not upload_record.get('variables'):
            return jsonify({
                'success': False,
                'error': 'Archivo no ha sido procesado. Use /parse primero.',
                'error_code': 'FILE_NOT_PARSED'
            }), 400
        
        return jsonify({
            'success': True,
            'upload_id': upload_id,
            'filename': upload_record['filename'],
            'variables': upload_record['variables'],
            'status': upload_record['status']
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al obtener variables: {str(e)}',
            'error_code': 'VARIABLES_ERROR'
        }), 500

@bp.route('/<int:upload_id>/categorization', methods=['POST'])
def save_categorization(upload_id):
    """Save variable categorization"""
    try:
        # Get upload record from database
        db = get_db_manager()
        upload_record = db.get_upload_record(upload_id)
        
        if not upload_record:
            return jsonify({
                'success': False,
                'error': 'Archivo no encontrado',
                'error_code': 'FILE_NOT_FOUND'
            }), 404
        
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Se requiere contenido JSON',
                'error_code': 'INVALID_CONTENT_TYPE'
            }), 400
        
        categorization_data = request.get_json()
        
        # Validate categorization data structure
        required_fields = ['instrument_vars', 'item_id_vars', 'metadata_vars', 'classification_vars', 'other_vars']
        for field in required_fields:
            if field not in categorization_data:
                return jsonify({
                    'success': False,
                    'error': f'Campo requerido faltante: {field}',
                    'error_code': 'MISSING_FIELD'
                }), 400
        
        # Create validation session with categorization
        session_id = db.create_validation_session(upload_id, categorization_data)
        
        return jsonify({
            'success': True,
            'upload_id': upload_id,
            'session_id': session_id,
            'categorization': categorization_data,
            'message': 'Categorización guardada exitosamente'
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al guardar categorización: {str(e)}',
            'error_code': 'CATEGORIZATION_ERROR'
        }), 500