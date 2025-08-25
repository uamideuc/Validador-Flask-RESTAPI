"""
File Security Validation Service
Provides content validation and malware protection for uploaded files
"""
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
    print("⚠️  python-magic not available - using fallback file type detection")

import zipfile
import os
import hashlib
from typing import Dict, Any, List
from dataclasses import dataclass


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
        Detect MIME type using python-magic (more reliable than file extension)
        
        Args:
            file_path: Path to file
            
        Returns:
            str: Detected MIME type
        """
        try:
            if self.magic_available:
                mime_type = magic.from_file(file_path, mime=True)
                return mime_type
            else:
                # Fallback to extension-based detection
                _, ext = os.path.splitext(file_path.lower())
                extension_mapping = {
                    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    '.xls': 'application/vnd.ms-excel',
                    '.csv': 'text/csv'
                }
                return extension_mapping.get(ext, 'application/octet-stream')
        except Exception as e:
            print(f"MIME type detection error: {str(e)}")
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