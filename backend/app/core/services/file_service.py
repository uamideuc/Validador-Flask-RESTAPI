"""
File Upload Service - Core Infrastructure
Provides secure file upload, parsing, and validation capabilities for all ToolKits
"""
import os
import pandas as pd
import openpyxl
from typing import List, Optional, Dict, Any, Tuple
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
import uuid
from datetime import datetime
from .security_service import FileSecurityValidator
from .file_handling.file_parser import FileParser
from .file_handling.data_cleaner import DataCleaner


class FileUploadService:
    """
    Core service for handling file uploads and parsing across all ToolKits
    
    Features:
    - Secure file upload with comprehensive validation
    - Support for CSV, XLSX, XLS formats
    - Security scanning for malware/macros
    - File parsing with pandas integration
    - Session-based file isolation
    """
    
    ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls', 'txt'}
    MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024  # 1GB
    
    def __init__(self, upload_folder: str):
        self.upload_folder = upload_folder
        os.makedirs(upload_folder, exist_ok=True)
        
        # Initialize specialized services
        self.security_validator = FileSecurityValidator(max_file_size=self.MAX_FILE_SIZE)
        self.file_parser = FileParser()
        self.data_cleaner = DataCleaner()
    
    def validate_file_format(self, file: FileStorage) -> bool:
        """Validate if file format is supported"""
        if not file or not file.filename:
            return False
        
        filename = file.filename.lower()
        return '.' in filename and \
               filename.rsplit('.', 1)[1] in self.ALLOWED_EXTENSIONS
    
    def validate_file_size(self, file: FileStorage) -> bool:
        """Validate file size"""
        if not file:
            return False
        
        # Check content length if available
        if hasattr(file, 'content_length') and file.content_length:
            return file.content_length <= self.MAX_FILE_SIZE
        
        # If content_length not available, we'll check during upload
        return True
    
    def upload_file(self, file: FileStorage) -> Dict[str, Any]:
        """
        Upload and save file to disk with comprehensive security validation
        Returns upload result with file info and security scan results
        """
        file_path = None
        try:
            # Basic file validation (backwards compatibility)
            if not self.validate_file_format(file):
                return {
                    'success': False,
                    'error': 'Formato de archivo no soportado. Use CSV, XLSX o XLS.',
                    'error_code': 'INVALID_FORMAT'
                }
            
            if not self.validate_file_size(file):
                return {
                    'success': False,
                    'error': f'Archivo demasiado grande. Máximo {self.MAX_FILE_SIZE // (1024*1024*1024)}GB.',
                    'error_code': 'FILE_TOO_LARGE'
                }
            
            # Generate unique filename
            original_filename = secure_filename(file.filename)
            file_extension = original_filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
            file_path = os.path.join(self.upload_folder, unique_filename)
            
            # Save file temporarily for security scanning
            file.save(file_path)
            
            # SECURITY: Comprehensive security scan
            print(f"🔍 Performing security scan on: {original_filename}")
            security_result = self.security_validator.validate_file_comprehensive(file_path)
            
            if not security_result.is_safe:
                # Remove unsafe file immediately
                os.remove(file_path)
                
                # Return detailed security error
                error_details = '; '.join(security_result.errors)
                warning_details = '; '.join(security_result.warnings) if security_result.warnings else ''
                
                full_error = error_details
                if warning_details:
                    full_error += f" Advertencias: {warning_details}"
                
                return {
                    'success': False,
                    'error': f'ARCHIVO BLOQUEADO POR SEGURIDAD: {full_error}',
                    'error_code': 'SECURITY_BLOCKED',
                    'security_scan': self.security_validator.get_security_report(security_result)
                }
            
            # File passed security checks
            print(f"✅ Security scan passed for: {original_filename}")
            
            # Get file info after security validation
            file_size = security_result.file_size
            
            # Create security report for successful upload
            security_report = self.security_validator.get_security_report(security_result)
            
            success_response = {
                'success': True,
                'file_id': unique_filename.rsplit('.', 1)[0],  # Remove extension for ID
                'original_filename': original_filename,
                'file_path': file_path,
                'file_size': file_size,
                'file_extension': file_extension,
                'security_scan': security_report
            }
            
            # Add warnings if any (non-blocking)
            if security_result.warnings:
                success_response['security_warnings'] = security_result.warnings
            
            return success_response
            
        except Exception as e:
            # Clean up file if it was created
            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except:
                    pass  # Best effort cleanup
            
            return {
                'success': False,
                'error': f'Error al procesar archivo: {str(e)}',
                'error_code': 'UPLOAD_ERROR'
            }
    
    def get_sheet_names(self, file_path: str) -> List[str]:
        """
        Get sheet names from Excel file
        Returns empty list for CSV files
        """
        try:
            if not file_path.lower().endswith(('.xlsx', '.xls')):
                return []
            
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Archivo no encontrado: {file_path}")
            
            # Use openpyxl for .xlsx files
            if file_path.lower().endswith('.xlsx'):
                workbook = openpyxl.load_workbook(file_path, read_only=True)
                sheet_names = workbook.sheetnames
                workbook.close()
                return sheet_names
            
            # Use pandas for .xls files (fallback)
            excel_file = pd.ExcelFile(file_path)
            return excel_file.sheet_names
            
        except Exception as e:
            raise Exception(f"Error al leer hojas del archivo: {str(e)}")
    
    def parse_file(self, file_path: str, sheet_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Parse file and return DataFrame with metadata
        """
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Archivo no encontrado: {file_path}")
            
            # Parse file using specialized service
            df = self.file_parser.parse_file(file_path, sheet_name)
            
            # Clean data using specialized service
            df, cleaning_info = self.data_cleaner.clean_dataframe(df)
            
            # Extract unnamed columns info for backwards compatibility
            unnamed_columns_info = cleaning_info.get('unnamed_columns', {})
            
            # Get column information
            columns = df.columns.tolist()
            
            # Get sample values for each column (first 5 non-null values)
            sample_values = {}
            for col in columns:
                non_null_values = df[col].dropna().astype(str).unique()[:5]
                sample_values[col] = non_null_values.tolist()
            
            # Basic statistics (convert numpy types to native Python types)
            stats = {
                'total_rows': int(len(df)),
                'total_columns': int(len(columns)),
                'empty_cells': int(df.isnull().sum().sum()),
                'memory_usage': int(df.memory_usage(deep=True).sum())
            }
            
            return {
                'success': True,
                'dataframe': df,
                'columns': columns,
                'sample_values': sample_values,
                'statistics': stats,
                'sheet_name': sheet_name,
                'unnamed_columns_info': unnamed_columns_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Error al procesar archivo: {str(e)}',
                'error_code': 'PARSE_ERROR'
            }
    
    
    def get_data_preview(self, file_path: str, sheet_name: Optional[str] = None, 
                        start_row: int = 0, rows_per_page: int = 10) -> Dict[str, Any]:
        """
        Get paginated data preview from file
        """
        try:
            # Parse file
            parse_result = self.parse_file(file_path, sheet_name)
            
            if not parse_result['success']:
                return parse_result
            
            df = parse_result['dataframe']
            
            # Get paginated data
            end_row = start_row + rows_per_page
            page_data = df.iloc[start_row:end_row]
            
            # Convert to records for JSON serialization
            records = page_data.to_dict('records')
            
            return {
                'success': True,
                'data': records,
                'columns': list(df.columns),
                'start_row': start_row,
                'rows_per_page': rows_per_page,
                'total_rows': len(df),
                'has_next_page': end_row < len(df),
                'has_previous_page': start_row > 0
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Error en vista previa: {str(e)}',
                'error_code': 'PREVIEW_ERROR'
            }
    
    def get_file_info(self, file_path: str) -> Dict[str, Any]:
        """Get basic file information"""
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Archivo no encontrado: {file_path}")
            
            stat = os.stat(file_path)
            file_extension = file_path.lower().split('.')[-1]
            
            info = {
                'file_size': stat.st_size,
                'file_extension': file_extension,
                'created_time': datetime.fromtimestamp(stat.st_ctime),
                'modified_time': datetime.fromtimestamp(stat.st_mtime),
                'is_excel': file_extension in ['xlsx', 'xls'],
                'is_csv': file_extension == 'csv'
            }
            
            # Add sheet information for Excel files
            if info['is_excel']:
                try:
                    info['sheet_names'] = self.get_sheet_names(file_path)
                    info['sheet_count'] = len(info['sheet_names'])
                except:
                    info['sheet_names'] = []
                    info['sheet_count'] = 0
            
            return info
            
        except Exception as e:
            raise Exception(f"Error al obtener información del archivo: {str(e)}")
    
    def cleanup_file(self, file_path: str) -> bool:
        """Remove uploaded file"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception:
            return False