"""
Security Services - Core Infrastructure
Combines file security validation and session authorization
"""

# File Security Services
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
    print("⚠️  python-magic not available - using fallback file type detection")

import zipfile
import os
import hashlib
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

# Session Authorization Services  
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from flask import jsonify


@dataclass
class SecurityScanResult:
    """Result of file security scan"""
    is_safe: bool
    detected_type: str
    file_size: int
    warnings: List[str]
    errors: List[str]
    scan_details: Dict[str, Any]


class FileSecurityValidator:
    """
    Comprehensive file security validator
    
    Features:
    - MIME type validation using python-magic (not just file extensions)
    - Macro detection in Office files
    - File size validation
    - Content inspection for suspicious patterns
    - Virus-like pattern detection
    """
    
    # Allowed MIME types for the application
    ALLOWED_MIME_TYPES = {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # .xlsx
        'application/vnd.ms-excel',  # .xls
        'text/csv',  # .csv
        'text/plain',  # .csv (alternative detection)
        'application/csv'  # .csv (another alternative)
    }
    
    # Suspicious file patterns that might indicate malware
    SUSPICIOUS_PATTERNS = [
        b'eval(',
        b'exec(',
        b'<script',
        b'javascript:',
        b'vbscript:',
        b'ActiveXObject',
        b'WScript.Shell',
        b'Shell.Application',
        b'cmd.exe',
        b'powershell'
    ]
    
    # Maximum allowed file size (16MB by default)
    MAX_FILE_SIZE = 16 * 1024 * 1024
    
    def __init__(self, max_file_size: int = None):
        """
        Initialize file security validator
        
        Args:
            max_file_size: Maximum allowed file size in bytes
        """
        self.max_file_size = max_file_size or self.MAX_FILE_SIZE
        
        # Test if python-magic is working
        try:
            magic.from_buffer(b"test", mime=True)
            self.magic_available = True
        except Exception:
            self.magic_available = False
            print("⚠️  python-magic not available - file type detection will be limited")
    
    def validate_file_comprehensive(self, file_path: str) -> SecurityScanResult:
        """
        Perform comprehensive security validation of a file
        
        Args:
            file_path: Path to the file to validate
            
        Returns:
            SecurityScanResult: Detailed scan results
        """
        warnings = []
        errors = []
        scan_details = {}
        
        try:
            # Check if file exists and is readable
            if not os.path.exists(file_path):
                return SecurityScanResult(
                    is_safe=False,
                    detected_type="unknown",
                    file_size=0,
                    warnings=[],
                    errors=["File does not exist"],
                    scan_details={}
                )
            
            # Get file size
            file_size = os.path.getsize(file_path)
            scan_details['file_size'] = file_size
            
            # Validate file size
            if file_size > self.max_file_size:
                errors.append(f"File too large: {file_size} bytes (max: {self.max_file_size})")
                return SecurityScanResult(
                    is_safe=False,
                    detected_type="oversized",
                    file_size=file_size,
                    warnings=warnings,
                    errors=errors,
                    scan_details=scan_details
                )
            
            if file_size == 0:
                errors.append("File is empty")
                return SecurityScanResult(
                    is_safe=False,
                    detected_type="empty",
                    file_size=0,
                    warnings=warnings,
                    errors=errors,
                    scan_details=scan_details
                )
            
            # Detect MIME type
            mime_type = self._detect_mime_type(file_path)
            scan_details['detected_mime_type'] = mime_type
            
            # Validate MIME type
            if mime_type not in self.ALLOWED_MIME_TYPES:
                errors.append(f"File type not allowed: {mime_type}")
                return SecurityScanResult(
                    is_safe=False,
                    detected_type=mime_type,
                    file_size=file_size,
                    warnings=warnings,
                    errors=errors,
                    scan_details=scan_details
                )
            
            # Scan for macros in Office files
            macro_scan = self._scan_for_macros(file_path, mime_type)
            scan_details['macro_scan'] = macro_scan
            
            if macro_scan.get('has_macros'):
                errors.append("File contains macros - BLOCKED for security")
                return SecurityScanResult(
                    is_safe=False,
                    detected_type=mime_type,
                    file_size=file_size,
                    warnings=warnings,
                    errors=errors,
                    scan_details=scan_details
                )
            
            # Scan for suspicious content
            content_scan = self._scan_file_content(file_path)
            scan_details['content_scan'] = content_scan
            
            if content_scan.get('suspicious_patterns_found', 0) > 0:
                warnings.append(f"Found {content_scan['suspicious_patterns_found']} suspicious patterns")
                # This is a warning, not an error - might be false positive
            
            # Calculate file hash for integrity
            file_hash = self._calculate_file_hash(file_path)
            scan_details['file_hash_sha256'] = file_hash
            
            # If we get here, file passed all security checks
            return SecurityScanResult(
                is_safe=True,
                detected_type=mime_type,
                file_size=file_size,
                warnings=warnings,
                errors=[],
                scan_details=scan_details
            )
            
        except Exception as e:
            errors.append(f"Security scan error: {str(e)}")
            return SecurityScanResult(
                is_safe=False,
                detected_type="error",
                file_size=file_size if 'file_size' in locals() else 0,
                warnings=warnings,
                errors=errors,
                scan_details=scan_details
            )
    
    def _detect_mime_type(self, file_path: str) -> str:
        """
        Detect MIME type using python-magic with enhanced XLSX handling
        
        Args:
            file_path: Path to file
            
        Returns:
            str: Detected MIME type
        """
        try:
            if self.magic_available:
                mime_type = magic.from_file(file_path, mime=True)
                
                # Handle common magic issues with XLSX files
                if mime_type == 'application/zip' or 'zip' in mime_type.lower():
                    # Check if it's actually an XLSX file by examining the file extension
                    # and trying to validate it's a proper Office document
                    if file_path.lower().endswith('.xlsx'):
                        if self._validate_xlsx_structure(file_path):
                            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        else:
                            return 'application/zip'  # It's a ZIP but not a valid XLSX
                
                # Some magic implementations return generic MIME types for XLSX
                elif mime_type in ['application/octet-stream', 'application/x-zip-compressed']:
                    if file_path.lower().endswith('.xlsx'):
                        if self._validate_xlsx_structure(file_path):
                            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                
                return mime_type
            else:
                # Fallback to extension-based detection with validation
                return self._fallback_mime_detection(file_path)
                
        except Exception as e:
            print(f"MIME type detection error: {str(e)}")
            # Try fallback detection
            return self._fallback_mime_detection(file_path)
    
    def _validate_xlsx_structure(self, file_path: str) -> bool:
        """
        Validate that a file has proper XLSX structure
        
        Args:
            file_path: Path to file to validate
            
        Returns:
            bool: True if file has valid XLSX structure
        """
        try:
            with zipfile.ZipFile(file_path, 'r') as zip_file:
                # Check for essential XLSX structure files
                required_files = ['[Content_Types].xml', 'xl/workbook.xml']
                
                file_list = zip_file.namelist()
                
                # Check if all required files exist
                for required_file in required_files:
                    if required_file not in file_list:
                        return False
                
                # Additional check: ensure it has worksheets
                has_worksheets = any(name.startswith('xl/worksheets/') and name.endswith('.xml') 
                                   for name in file_list)
                
                return has_worksheets
                
        except (zipfile.BadZipFile, Exception):
            return False
    
    def _fallback_mime_detection(self, file_path: str) -> str:
        """
        Fallback MIME type detection with enhanced validation
        
        Args:
            file_path: Path to file
            
        Returns:
            str: Detected MIME type
        """
        try:
            _, ext = os.path.splitext(file_path.lower())
            extension_mapping = {
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                '.xls': 'application/vnd.ms-excel',
                '.csv': 'text/csv'
            }
            
            mime_type = extension_mapping.get(ext, 'application/octet-stream')
            
            # For XLSX files, validate structure even in fallback mode
            if ext == '.xlsx':
                if not self._validate_xlsx_structure(file_path):
                    return 'application/octet-stream'  # Not a valid XLSX
            
            return mime_type
            
        except Exception:
            return 'application/octet-stream'
    
    def _scan_for_macros(self, file_path: str, mime_type: str) -> Dict[str, Any]:
        """
        Scan Office files for VBA macros
        
        Args:
            file_path: Path to file
            mime_type: Detected MIME type
            
        Returns:
            Dict: Macro scan results
        """
        scan_result = {
            'has_macros': False,
            'macro_files_found': [],
            'scan_performed': False,
            'error': None
        }
        
        try:
            # Only scan Office files
            if mime_type in ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                           'application/vnd.ms-excel']:
                
                scan_result['scan_performed'] = True
                
                if file_path.lower().endswith('.xlsx'):
                    # Modern Excel files are ZIP archives
                    try:
                        with zipfile.ZipFile(file_path, 'r') as zip_file:
                            # Look for VBA project files
                            vba_files = [f for f in zip_file.namelist() 
                                       if 'vbaProject' in f or 'macros' in f.lower()]
                            
                            if vba_files:
                                scan_result['has_macros'] = True
                                scan_result['macro_files_found'] = vba_files
                            
                            # Also check for suspicious file names in the ZIP
                            suspicious_files = [f for f in zip_file.namelist()
                                              if any(susp in f.lower() for susp in ['macro', 'vba', 'module'])]
                            
                            if suspicious_files and not scan_result['has_macros']:
                                scan_result['has_macros'] = True
                                scan_result['macro_files_found'].extend(suspicious_files)
                                
                    except zipfile.BadZipFile:
                        scan_result['error'] = 'File is not a valid ZIP archive'
                    except Exception as e:
                        scan_result['error'] = f'Error scanning ZIP: {str(e)}'
                
                elif file_path.lower().endswith('.xls'):
                    # Legacy Excel files - basic heuristic check
                    try:
                        with open(file_path, 'rb') as f:
                            content = f.read(8192)  # Read first 8KB
                            
                            # Look for VBA signatures in binary content
                            vba_signatures = [b'VBA', b'MODULE', b'MACRO', b'Sub ', b'Function ']
                            
                            for signature in vba_signatures:
                                if signature in content:
                                    scan_result['has_macros'] = True
                                    scan_result['macro_files_found'].append(f'VBA signature: {signature.decode("utf-8", errors="ignore")}')
                                    break
                                    
                    except Exception as e:
                        scan_result['error'] = f'Error scanning XLS file: {str(e)}'
            
        except Exception as e:
            scan_result['error'] = f'Macro scan error: {str(e)}'
        
        return scan_result
    
    def _scan_file_content(self, file_path: str) -> Dict[str, Any]:
        """
        Scan file content for suspicious patterns
        
        Args:
            file_path: Path to file
            
        Returns:
            Dict: Content scan results
        """
        scan_result = {
            'suspicious_patterns_found': 0,
            'patterns_detected': [],
            'content_scanned_bytes': 0,
            'error': None
        }
        
        try:
            # Read first 64KB of file for pattern scanning
            max_scan_bytes = 64 * 1024
            
            with open(file_path, 'rb') as f:
                content = f.read(max_scan_bytes)
                scan_result['content_scanned_bytes'] = len(content)
                
                # Scan for suspicious patterns
                for pattern in self.SUSPICIOUS_PATTERNS:
                    if pattern in content:
                        scan_result['suspicious_patterns_found'] += 1
                        scan_result['patterns_detected'].append(pattern.decode('utf-8', errors='ignore'))
                
        except Exception as e:
            scan_result['error'] = f'Content scan error: {str(e)}'
        
        return scan_result
    
    def _calculate_file_hash(self, file_path: str) -> str:
        """
        Calculate SHA-256 hash of file for integrity checking
        
        Args:
            file_path: Path to file
            
        Returns:
            str: SHA-256 hash in hexadecimal
        """
        try:
            sha256_hash = hashlib.sha256()
            with open(file_path, 'rb') as f:
                # Read in chunks to handle large files efficiently
                for chunk in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(chunk)
            return sha256_hash.hexdigest()
        except Exception as e:
            print(f"Hash calculation error: {str(e)}")
            return "error"
    
    def get_security_report(self, scan_result: SecurityScanResult) -> Dict[str, Any]:
        """
        Generate a comprehensive security report
        
        Args:
            scan_result: Result from validate_file_comprehensive
            
        Returns:
            Dict: Human-readable security report
        """
        return {
            'file_safe': scan_result.is_safe,
            'security_status': 'SAFE' if scan_result.is_safe else 'BLOCKED',
            'file_type': scan_result.detected_type,
            'file_size_mb': round(scan_result.file_size / (1024 * 1024), 2),
            'warnings': scan_result.warnings,
            'errors': scan_result.errors,
            'security_checks': {
                'mime_type_valid': scan_result.detected_type in self.ALLOWED_MIME_TYPES,
                'size_within_limits': scan_result.file_size <= self.max_file_size,
                'no_macros_detected': not scan_result.scan_details.get('macro_scan', {}).get('has_macros', False),
                'content_scan_clean': scan_result.scan_details.get('content_scan', {}).get('suspicious_patterns_found', 0) == 0
            },
            'scan_timestamp': scan_result.scan_details.get('scan_timestamp', 'unknown'),
            'file_hash': scan_result.scan_details.get('file_hash_sha256', 'unknown')
        }


# Session Authorization Services
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
            from app.core.database import db_manager
            from app.core.services.session_service import SessionManager
            
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
            from app.core.database import db_manager
            from app.core.services.session_service import SessionManager
            
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
        from app.core.database import db_manager
        
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
        from app.core.database import db_manager
        
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
            from app.core.database import db_manager
            from app.core.services.session_service import SessionManager
            
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