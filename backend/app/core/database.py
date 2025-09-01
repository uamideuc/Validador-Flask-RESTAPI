"""
Database models and connection utilities
"""
import sqlite3
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from contextlib import contextmanager

class DatabaseManager:
    """Manages database connections and operations"""
    
    def __init__(self, db_path: str = 'validador.db'):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database with required tables"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # File uploads tracking with session support
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS uploads (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id VARCHAR(64) NOT NULL,
                    filename VARCHAR(255) NOT NULL,
                    file_path VARCHAR(500) NOT NULL,
                    upload_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME,
                    file_size INTEGER,
                    status VARCHAR(50) DEFAULT 'uploaded',
                    sheet_name VARCHAR(255),
                    variables_json TEXT
                )
            ''')
            
            # Validation sessions with session support
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS validation_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    upload_id INTEGER NOT NULL,
                    session_id VARCHAR(64) NOT NULL,
                    categorization_json TEXT NOT NULL,
                    validation_results_json TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME,
                    status VARCHAR(50) DEFAULT 'pending',
                    FOREIGN KEY (upload_id) REFERENCES uploads(id)
                )
            ''')
            
            # Export history with session support
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS exports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    validation_session_id INTEGER NOT NULL,
                    session_id VARCHAR(64) NOT NULL,
                    export_type VARCHAR(50) NOT NULL,
                    file_path VARCHAR(500) NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME,
                    FOREIGN KEY (validation_session_id) REFERENCES validation_sessions(id)
                )
            ''')
            
            # Create indices for performance
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_uploads_session ON uploads(session_id)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_validation_session ON validation_sessions(session_id)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_exports_session ON exports(session_id)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_uploads_expires ON uploads(expires_at)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_validation_expires ON validation_sessions(expires_at)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_exports_expires ON exports(expires_at)
            ''')
            
            conn.commit()
    
    @contextmanager
    def get_connection(self):
        """Get database connection with context manager"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Enable dict-like access
        try:
            yield conn
        finally:
            conn.close()
    
    def create_upload_record(self, session_id: str, filename: str, file_path: str, file_size: int, 
                           sheet_name: Optional[str] = None, variables: Optional[List[str]] = None) -> int:
        """Create a new upload record with session ownership"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            variables_json = json.dumps(variables) if variables else None
            
            # Calculate expiration (24 hours from now)
            expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
            
            cursor.execute('''
                INSERT INTO uploads (session_id, filename, file_path, file_size, expires_at, sheet_name, variables_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (session_id, filename, file_path, file_size, expires_at, sheet_name, variables_json))
            
            conn.commit()
            return cursor.lastrowid
    
    def get_upload_record(self, upload_id: int) -> Optional[Dict[str, Any]]:
        """Get upload record by ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM uploads WHERE id = ?', (upload_id,))
            row = cursor.fetchone()
            
            if row:
                record = dict(row)
                if record['variables_json']:
                    record['variables'] = json.loads(record['variables_json'])
                return record
            return None
    
    def update_upload_variables(self, upload_id: int, variables: List[str]):
        """Update variables for an upload"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            variables_json = json.dumps(variables)
            
            cursor.execute('''
                UPDATE uploads SET variables_json = ?, status = 'parsed' WHERE id = ?
            ''', (variables_json, upload_id))
            
            conn.commit()
    
    def create_validation_session(self, upload_id: int, session_id: str, categorization: Dict[str, Any]) -> int:
        """Create a new validation session with session ownership"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            categorization_json = json.dumps(categorization)
            
            # Calculate expiration (24 hours from now)
            expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
            
            cursor.execute('''
                INSERT INTO validation_sessions (upload_id, session_id, categorization_json, expires_at)
                VALUES (?, ?, ?, ?)
            ''', (upload_id, session_id, categorization_json, expires_at))
            
            conn.commit()
            return cursor.lastrowid
    
    def update_validation_results(self, session_id: int, results: Dict[str, Any]):
        """Update validation results for a session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            results_json = json.dumps(results)
            
            cursor.execute('''
                UPDATE validation_sessions 
                SET validation_results_json = ?, status = 'completed'
                WHERE id = ?
            ''', (results_json, session_id))
            
            conn.commit()
    
    def get_validation_session(self, session_id: int) -> Optional[Dict[str, Any]]:
        """Get validation session by ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT vs.*, u.filename, u.file_path 
                FROM validation_sessions vs
                JOIN uploads u ON vs.upload_id = u.id
                WHERE vs.id = ?
            ''', (session_id,))
            row = cursor.fetchone()
            
            if row:
                record = dict(row)
                record['categorization'] = json.loads(record['categorization_json'])
                if record['validation_results_json']:
                    record['validation_results'] = json.loads(record['validation_results_json'])
                return record
            return None
    
    def create_export_record(self, validation_session_id: int, session_id: str, export_type: str, file_path: str) -> int:
        """Create a new export record with session ownership"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Calculate expiration (24 hours from now)
            expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
            
            cursor.execute('''
                INSERT INTO exports (validation_session_id, session_id, export_type, file_path, expires_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (validation_session_id, session_id, export_type, file_path, expires_at))
            
            conn.commit()
            return cursor.lastrowid
    
    def get_export_record(self, export_id: int) -> Optional[Dict[str, Any]]:
        """Get export record by ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM exports WHERE id = ?', (export_id,))
            row = cursor.fetchone()
            
            return dict(row) if row else None
    
    def cleanup_expired_data(self) -> Dict[str, int]:
        """Clean up expired data and files"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get files to delete
            cursor.execute('''
                SELECT file_path FROM uploads WHERE expires_at < ?
                UNION
                SELECT file_path FROM exports WHERE expires_at < ?
            ''', (datetime.now(timezone.utc), datetime.now(timezone.utc)))
            
            files_to_delete = cursor.fetchall()
            deleted_files = 0
            
            # Delete physical files
            for file_record in files_to_delete:
                file_path = file_record['file_path']
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                        deleted_files += 1
                    except Exception as e:
                        print(f"Error deleting file {file_path}: {str(e)}")
            
            # Delete expired records
            cursor.execute('DELETE FROM exports WHERE expires_at < ?', (datetime.now(timezone.utc),))
            deleted_exports = cursor.rowcount
            
            cursor.execute('DELETE FROM validation_sessions WHERE expires_at < ?', (datetime.now(timezone.utc),))
            deleted_validation_sessions = cursor.rowcount
            
            cursor.execute('DELETE FROM uploads WHERE expires_at < ?', (datetime.now(timezone.utc),))
            deleted_uploads = cursor.rowcount
            
            conn.commit()
            
            return {
                'deleted_files': deleted_files,
                'deleted_exports': deleted_exports,
                'deleted_validation_sessions': deleted_validation_sessions,
                'deleted_uploads': deleted_uploads
            }
    
    def cleanup_old_records(self, days: int = 7):
        """Clean up old records based on creation date, regardless of expiration status.
        
        Serves as a fallback to prevent orphaned data.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Delete old exports and their files
            cursor.execute('''
                SELECT file_path FROM exports 
                WHERE created_at < datetime('now', '-{} days')
            '''.format(days))
            
            old_exports = cursor.fetchall()
            for export in old_exports:
                file_path = export['file_path']
                if os.path.exists(file_path):
                    os.remove(file_path)
            
            # Delete old records
            cursor.execute('''
                DELETE FROM exports 
                WHERE created_at < datetime('now', '-{} days')
            '''.format(days))
            
            cursor.execute('''
                DELETE FROM validation_sessions 
                WHERE created_at < datetime('now', '-{} days')
            '''.format(days))
            
            cursor.execute('''
                DELETE FROM uploads 
                WHERE upload_timestamp < datetime('now', '-{} days')
            '''.format(days))
            
            conn.commit()
    
    # Session-based query methods
    def get_user_uploads_count(self, session_id: str) -> int:
        """Get count of uploads for a session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) as count FROM uploads WHERE session_id = ?', (session_id,))
            return cursor.fetchone()['count']
    
    def get_user_validations_count(self, session_id: str) -> int:
        """Get count of validation sessions for a session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) as count FROM validation_sessions WHERE session_id = ?', (session_id,))
            return cursor.fetchone()['count']
    
    def get_user_exports_count(self, session_id: str) -> int:
        """Get count of exports for a session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) as count FROM exports WHERE session_id = ?', (session_id,))
            return cursor.fetchone()['count']

# Global database manager instance
db_manager = DatabaseManager()