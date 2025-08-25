"""
Validation routes
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.session_auth import require_session_ownership
from app.services.validation_engine import ValidationEngine
from app.services.file_service import FileUploadService
from app.models.database import db_manager, DatabaseManager
from app.models.data_models import VariableCategorization
import pandas as pd
import os

bp = Blueprint('validation', __name__, url_prefix='/api/validation')

def get_db_manager():
    """Get database manager instance"""
    if current_app.config.get('TESTING'):
        db_path = current_app.config.get('DATABASE_PATH', 'test.db')
        return DatabaseManager(db_path)
    else:
        return db_manager

def get_file_service():
    """Get file service instance"""
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    return FileUploadService(upload_folder)

@bp.route('/run', methods=['POST'])
@jwt_required()
@require_session_ownership('validation')
def run_validation():
    """Run validation on categorized data"""
    try:
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Se requiere contenido JSON',
                'error_code': 'INVALID_CONTENT_TYPE'
            }), 400
        
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({
                'success': False,
                'error': 'session_id es requerido',
                'error_code': 'MISSING_SESSION_ID'
            }), 400
        
        # Get validation session from database
        db = get_db_manager()
        session = db.get_validation_session(session_id)
        
        if not session:
            return jsonify({
                'success': False,
                'error': 'Sesión de validación no encontrada',
                'error_code': 'SESSION_NOT_FOUND'
            }), 404
        
        # Check if file still exists
        if not os.path.exists(session['file_path']):
            return jsonify({
                'success': False,
                'error': 'Archivo no disponible en el servidor',
                'error_code': 'FILE_NOT_AVAILABLE'
            }), 404
        
        # Parse the file to get DataFrame
        file_service = get_file_service()
        parse_result = file_service.parse_file(session['file_path'])
        
        if not parse_result['success']:
            return jsonify({
                'success': False,
                'error': f'Error al procesar archivo: {parse_result["error"]}',
                'error_code': 'FILE_PARSE_ERROR'
            }), 400
        
        # Create categorization object
        categorization_data = session['categorization']
        categorization = VariableCategorization.from_dict(categorization_data)
        
        # Create validation engine and run validations
        validation_engine = ValidationEngine(parse_result['dataframe'], categorization)
        validation_report = validation_engine.generate_comprehensive_report()
        
        # Save validation results to database
        db.update_validation_results(session_id, validation_report.to_dict())
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'validation_report': validation_report.to_dict(),
            'message': 'Validación completada exitosamente'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error interno durante validación: {str(e)}',
            'error_code': 'VALIDATION_ERROR'
        }), 500

@bp.route('/<int:session_id>/report', methods=['GET'])
@jwt_required()
@require_session_ownership('validation')
def get_report(session_id):
    """Get validation report"""
    try:
        # Get validation session from database
        db = get_db_manager()
        session = db.get_validation_session(session_id)
        
        if not session:
            return jsonify({
                'success': False,
                'error': 'Sesión de validación no encontrada',
                'error_code': 'SESSION_NOT_FOUND'
            }), 404
        
        if not session.get('validation_results'):
            return jsonify({
                'success': False,
                'error': 'Validación no ha sido ejecutada para esta sesión',
                'error_code': 'VALIDATION_NOT_RUN'
            }), 400
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'validation_report': session['validation_results'],
            'filename': session['filename'],
            'created_at': session['created_at']
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al obtener reporte: {str(e)}',
            'error_code': 'REPORT_ERROR'
        }), 500

@bp.route('/<int:session_id>/variable-values', methods=['POST'])
@jwt_required()
@require_session_ownership('validation')
def get_variable_values(session_id):
    """Get detailed values for a specific variable"""
    try:
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Se requiere contenido JSON',
                'error_code': 'INVALID_CONTENT_TYPE'
            }), 400
        
        data = request.get_json()
        variable = data.get('variable')
        instrument = data.get('instrument')
        
        if not variable:
            return jsonify({
                'success': False,
                'error': 'Variable es requerida',
                'error_code': 'MISSING_VARIABLE'
            }), 400
        
        # Get validation session from database
        db = get_db_manager()
        session = db.get_validation_session(session_id)
        
        if not session:
            return jsonify({
                'success': False,
                'error': 'Sesión de validación no encontrada',
                'error_code': 'SESSION_NOT_FOUND'
            }), 404
        
        # Check if file still exists
        if not os.path.exists(session['file_path']):
            return jsonify({
                'success': False,
                'error': 'Archivo no disponible en el servidor',
                'error_code': 'FILE_NOT_AVAILABLE'
            }), 404
        
        # Parse the file to get DataFrame
        file_service = get_file_service()
        parse_result = file_service.parse_file(session['file_path'])
        
        if not parse_result['success']:
            return jsonify({
                'success': False,
                'error': f'Error al procesar archivo: {parse_result["error"]}',
                'error_code': 'FILE_PARSE_ERROR'
            }), 400
        
        df = parse_result['dataframe']
        
        # Check if variable exists in dataframe
        if variable not in df.columns:
            return jsonify({
                'success': False,
                'error': f'Variable "{variable}" no encontrada en el archivo',
                'error_code': 'VARIABLE_NOT_FOUND'
            }), 404
        
        # Get variable values and statistics
        variable_series = df[variable]
        
        # Calculate value counts
        value_counts = variable_series.value_counts(dropna=False)
        total_items = len(variable_series)
        empty_count = variable_series.isna().sum()
        
        # Create detailed values data
        unique_values = []
        for value, count in value_counts.items():
            percentage = (count / total_items) * 100
            unique_values.append({
                'value': str(value) if pd.notna(value) else '(Vacío)',
                'count': int(count),
                'percentage': round(percentage, 2)
            })
        
        # Calculate completeness
        completeness = ((total_items - empty_count) / total_items) * 100 if total_items > 0 else 0
        
        values_data = {
            'unique_values': unique_values,
            'total_items': total_items,
            'empty_count': int(empty_count),
            'completeness': round(completeness, 1),
            'variable_name': variable,
            'instrument_name': instrument
        }
        
        return jsonify({
            'success': True,
            'values_data': values_data,
            'message': 'Valores de variable obtenidos exitosamente'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al obtener valores de variable: {str(e)}',
            'error_code': 'VARIABLE_VALUES_ERROR'
        }), 500