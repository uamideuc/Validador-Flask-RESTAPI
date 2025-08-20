"""
File upload and parsing service
"""
import os
import pandas as pd
import openpyxl
from typing import List, Optional, Dict, Any, Tuple
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
import uuid
from datetime import datetime

class FileUploadService:
    """Service for handling file uploads and parsing"""
    
    ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}
    MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB
    
    def __init__(self, upload_folder: str):
        self.upload_folder = upload_folder
        os.makedirs(upload_folder, exist_ok=True)
    
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
        Upload and save file to disk
        Returns upload result with file info
        """
        try:
            # Validate file
            if not self.validate_file_format(file):
                return {
                    'success': False,
                    'error': 'Formato de archivo no soportado. Use CSV, XLSX o XLS.',
                    'error_code': 'INVALID_FORMAT'
                }
            
            if not self.validate_file_size(file):
                return {
                    'success': False,
                    'error': f'Archivo demasiado grande. Máximo {self.MAX_FILE_SIZE // (1024*1024)}MB.',
                    'error_code': 'FILE_TOO_LARGE'
                }
            
            # Generate unique filename
            original_filename = secure_filename(file.filename)
            file_extension = original_filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
            file_path = os.path.join(self.upload_folder, unique_filename)
            
            # Save file
            file.save(file_path)
            
            # Get file size
            file_size = os.path.getsize(file_path)
            
            # Validate size after saving
            if file_size > self.MAX_FILE_SIZE:
                os.remove(file_path)
                return {
                    'success': False,
                    'error': f'Archivo demasiado grande. Máximo {self.MAX_FILE_SIZE // (1024*1024)}MB.',
                    'error_code': 'FILE_TOO_LARGE'
                }
            
            return {
                'success': True,
                'file_id': unique_filename.rsplit('.', 1)[0],  # Remove extension for ID
                'original_filename': original_filename,
                'file_path': file_path,
                'file_size': file_size,
                'file_extension': file_extension
            }
            
        except Exception as e:
            # Clean up file if it was created
            if 'file_path' in locals() and os.path.exists(file_path):
                os.remove(file_path)
            
            return {
                'success': False,
                'error': f'Error al subir archivo: {str(e)}',
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
            
            # Determine file type and parse accordingly
            file_extension = file_path.lower().split('.')[-1]
            
            if file_extension == 'csv':
                df = self._parse_csv(file_path)
            elif file_extension in ['xlsx', 'xls']:
                df = self._parse_excel(file_path, sheet_name)
            else:
                raise ValueError(f"Formato de archivo no soportado: {file_extension}")
            
            # Validate DataFrame
            if df.empty:
                raise ValueError("El archivo está vacío o no contiene datos válidos")
            
            # Handle unnamed columns
            df, unnamed_columns_info = self._handle_unnamed_columns(df)
            
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
                'error': f"Error al procesar archivo: {str(e)}",
                'error_code': 'PARSE_ERROR'
            }
    
    def _parse_csv(self, file_path: str) -> pd.DataFrame:
        """Parse CSV file with encoding detection"""
        encodings = ['utf-8', 'latin1', 'cp1252', 'iso-8859-1']
        
        for encoding in encodings:
            try:
                df = pd.read_csv(file_path, encoding=encoding)
                return df
            except UnicodeDecodeError:
                continue
            except Exception as e:
                if encoding == encodings[-1]:  # Last encoding attempt
                    raise e
                continue
        
        raise ValueError("No se pudo determinar la codificación del archivo CSV")
    
    def _parse_excel(self, file_path: str, sheet_name: Optional[str] = None) -> pd.DataFrame:
        """Parse Excel file"""
        try:
            if sheet_name:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
            else:
                # If no sheet specified, use the first sheet
                df = pd.read_excel(file_path, sheet_name=0)
            
            return df
            
        except Exception as e:
            raise ValueError(f"Error al leer archivo Excel: {str(e)}")
    
    def _handle_unnamed_columns(self, df: pd.DataFrame) -> tuple:
        """
        Handle unnamed columns by giving them descriptive names
        Returns modified DataFrame and info about renamed columns
        """
        unnamed_columns_info = {
            'has_unnamed': False,
            'renamed_columns': [],
            'total_unnamed': 0
        }
        
        # Create a copy to avoid modifying original
        df_copy = df.copy()
        
        # Find unnamed columns (typically start with 'Unnamed:' in pandas)
        renamed_columns = []
        
        for i, col in enumerate(df_copy.columns):
            col_str = str(col)
            # Check if column is unnamed (pandas pattern) or empty/null
            if (col_str.startswith('Unnamed:') or 
                col_str.strip() == '' or 
                col_str.lower() in ['nan', 'none', 'null'] or
                pd.isna(col)):
                
                new_name = f'col_sin_nombre{i+1}'
                
                # Ensure unique name
                counter = 1
                original_new_name = new_name
                while new_name in df_copy.columns:
                    new_name = f'{original_new_name}_{counter}'
                    counter += 1
                
                # Get sample values for this column
                sample_values = df_copy.iloc[:, i].dropna().astype(str).unique()[:3].tolist()
                
                renamed_columns.append({
                    'original_name': col_str,
                    'new_name': new_name,
                    'column_index': i + 1,
                    'sample_values': sample_values
                })
                
                # Rename the column
                df_copy = df_copy.rename(columns={col: new_name})
        
        if renamed_columns:
            unnamed_columns_info = {
                'has_unnamed': True,
                'renamed_columns': renamed_columns,
                'total_unnamed': len(renamed_columns)
            }
        
        return df_copy, unnamed_columns_info
    
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