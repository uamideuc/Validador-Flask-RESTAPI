"""
Export routes
"""
from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.session_auth import require_session_ownership, get_current_session_id
from app.services.data_normalizer import DataNormalizer
from app.services.file_service import FileUploadService
from app.services.pdf_generator import PDFReportGenerator
from app.models.database import db_manager, DatabaseManager
from app.models.data_models import VariableCategorization
import pandas as pd
import os
import tempfile
from datetime import datetime

bp = Blueprint('export', __name__, url_prefix='/api/export')

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

@bp.route('/normalized', methods=['POST'])
@jwt_required()
def export_normalized():
    """Export normalized data"""
    try:
        print("DEBUG: export_normalized called")
        print(f"DEBUG: Request JSON: {request.get_json()}")
        print(f"DEBUG: JWT Identity: {get_jwt_identity()}")
        
        # Get current session ID for ownership validation
        current_session_id = get_current_session_id()
        print(f"DEBUG: Current session ID: {current_session_id}")
        
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
        
        # Validate ownership: session must belong to current user
        if session.get('session_id') != current_session_id:
            return jsonify({
                'success': False,
                'error': 'Acceso no autorizado a esta sesión de validación',
                'error_code': 'UNAUTHORIZED_SESSION_ACCESS'
            }), 403
        
        # Check if file still exists
        print(f"DEBUG: Checking file exists at: {session['file_path']}")
        if not os.path.exists(session['file_path']):
            print("DEBUG: File does not exist!")
            return jsonify({
                'success': False,
                'error': 'Archivo no disponible en el servidor',
                'error_code': 'FILE_NOT_AVAILABLE'
            }), 404
        
        print("DEBUG: File exists, parsing...")
        # Parse the file to get DataFrame
        file_service = get_file_service()
        parse_result = file_service.parse_file(session['file_path'])
        print(f"DEBUG: Parse result success: {parse_result.get('success')}")
        
        if not parse_result['success']:
            return jsonify({
                'success': False,
                'error': f'Error al procesar archivo: {parse_result["error"]}',
                'error_code': 'FILE_PARSE_ERROR'
            }), 400
        
        # Create categorization object
        print("DEBUG: Creating categorization object...")
        categorization_data = session['categorization']
        categorization = VariableCategorization.from_dict(categorization_data)
        print(f"DEBUG: Categorization created: {type(categorization)}")
        
        # Normalize data
        print("DEBUG: Starting data normalization...")
        normalizer = DataNormalizer()
        normalized_data, name_mapping = normalizer.normalize_column_names(
            parse_result['dataframe'], 
            categorization
        )
        print("DEBUG: Data normalization completed")
        
        # Create mapping sheet
        mapping_sheet = normalizer.create_mapping_sheet(name_mapping, categorization)
        
        # Export to Excel buffer
        excel_buffer = normalizer.export_normalized_data(normalized_data, mapping_sheet)
        
        # Save to temporary file for download
        temp_dir = tempfile.gettempdir()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"datos_normalizados_{timestamp}.xlsx"
        temp_file_path = os.path.join(temp_dir, filename)
        
        # Save buffer to file
        normalizer.save_normalized_file(excel_buffer, temp_file_path)
        
        # Create export record in database
        print(f"DEBUG: Creating export record with validation_session_id={session_id}, session_id={current_session_id}")
        export_id = db.create_export_record(
            validation_session_id=session_id,
            session_id=current_session_id,
            export_type='normalized_xlsx',
            file_path=temp_file_path
        )
        print(f"DEBUG: Export record created with ID: {export_id}")
        
        return jsonify({
            'success': True,
            'export_id': export_id,
            'filename': filename,
            'session_id': session_id,
            'variables_normalized': len(name_mapping),
            'message': 'Datos normalizados generados exitosamente'
        }), 201
        
    except Exception as e:
        import traceback
        print(f"DEBUG: Exception in export_normalized: {str(e)}")
        print(f"DEBUG: Traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'Error durante exportación: {str(e)}',
            'error_code': 'EXPORT_ERROR'
        }), 500

@bp.route('/<int:export_id>/download', methods=['GET'])
@jwt_required()
def download_export(export_id):
    """Download exported file"""
    try:
        # Get export record from database
        db = get_db_manager()
        export_record = db.get_export_record(export_id)
        
        if not export_record:
            return jsonify({
                'success': False,
                'error': 'Exportación no encontrada',
                'error_code': 'EXPORT_NOT_FOUND'
            }), 404
        
        file_path = export_record['file_path']
        
        # Check if file exists
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'Archivo de exportación no disponible',
                'error_code': 'EXPORT_FILE_NOT_AVAILABLE'
            }), 404
        
        # Extract filename from path
        filename = os.path.basename(file_path)
        
        # Determine mimetype based on file extension
        if filename.lower().endswith('.pdf'):
            mimetype = 'application/pdf'
        elif filename.lower().endswith('.xlsx'):
            mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        else:
            mimetype = 'application/octet-stream'
        
        # Send file with explicit headers
        response = send_file(
            file_path,
            as_attachment=True,
            download_name=filename,
            mimetype=mimetype
        )
        
        # Ensure Content-Disposition header is set correctly
        response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al descargar archivo: {str(e)}',
            'error_code': 'DOWNLOAD_ERROR'
        }), 500

@bp.route('/validation-report/<int:session_id>', methods=['POST'])
@jwt_required()
def export_validation_report_pdf(session_id):
    """Export validation report as PDF"""
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
        
        # Generate PDF report
        pdf_generator = PDFReportGenerator()
        pdf_buffer = pdf_generator.generate_validation_report(session['validation_results'])
        
        # Save to temporary file for download
        temp_dir = tempfile.gettempdir()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"reporte_validacion_{timestamp}.pdf"
        temp_file_path = os.path.join(temp_dir, filename)
        
        with open(temp_file_path, 'wb') as f:
            f.write(pdf_buffer.getvalue())
        
        # Create export record in database
        current_session_id = get_current_session_id()
        export_id = db.create_export_record(
            validation_session_id=session_id,
            session_id=current_session_id,
            export_type='validation_report_pdf',
            file_path=temp_file_path
        )
        
        return jsonify({
            'success': True,
            'export_id': export_id,
            'filename': filename,
            'session_id': session_id,
            'message': 'Reporte PDF generado exitosamente'
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al generar reporte PDF: {str(e)}',
            'error_code': 'PDF_EXPORT_ERROR'
        }), 500

@bp.route('/validation-excel/<int:session_id>', methods=['POST'])
@jwt_required()
def export_validation_excel(session_id):
    """Export validation report as Excel with original data and annotations"""
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
        
        # Parse the original file to get DataFrame
        file_service = get_file_service()
        parse_result = file_service.parse_file(session['file_path'])
        
        if not parse_result['success']:
            return jsonify({
                'success': False,
                'error': f'Error al procesar archivo: {parse_result["error"]}',
                'error_code': 'FILE_PARSE_ERROR'
            }), 400
        
        # Create categorization object and mapping
        categorization_data = session['categorization']
        categorization = VariableCategorization.from_dict(categorization_data)
        
        normalizer = DataNormalizer()
        _, name_mapping = normalizer.normalize_column_names(parse_result['dataframe'], categorization)
        mapping_sheet = normalizer.create_mapping_sheet(name_mapping, categorization)
        
        # Export validation Excel
        validation_buffer = normalizer.export_validation_data(
            parse_result['dataframe'], 
            session['validation_results'],
            mapping_sheet
        )
        
        # Save to temporary file for download
        temp_dir = tempfile.gettempdir()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"validacion_detallada_{timestamp}.xlsx"
        temp_file_path = os.path.join(temp_dir, filename)
        
        normalizer.save_normalized_file(validation_buffer, temp_file_path)
        
        # Create export record in database
        current_session_id = get_current_session_id()
        export_id = db.create_export_record(
            validation_session_id=session_id,
            session_id=current_session_id,
            export_type='validation_excel',
            file_path=temp_file_path
        )
        
        return jsonify({
            'success': True,
            'export_id': export_id,
            'filename': filename,
            'session_id': session_id,
            'message': 'Excel de validación generado exitosamente'
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al generar Excel de validación: {str(e)}',
            'error_code': 'VALIDATION_EXCEL_ERROR'
        }), 500