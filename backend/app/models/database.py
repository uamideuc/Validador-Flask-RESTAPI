"""
Database models and connection utilities
"""
import sqlite3
import json
import os
from datetime import datetime
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
            
            # File uploads tracking
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS uploads (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename VARCHAR(255) NOT NULL,
                    file_path VARCHAR(500) NOT NULL,
                    upload_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    file_size INTEGER,
                    status VARCHAR(50) DEFAULT 'uploaded',
                    sheet_name VARCHAR(255),
                    variables_json TEXT
                )
            ''')
            
            # Validation sessions
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS validation_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    upload_id INTEGER NOT NULL,
                    categorization_json TEXT NOT NULL,
                    validation_results_json TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status VARCHAR(50) DEFAULT 'pending',
                    FOREIGN KEY (upload_id) REFERENCES uploads(id)
                )
            ''')
            
            # Export history
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS exports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    validation_session_id INTEGER NOT NULL,
                    export_type VARCHAR(50) NOT NULL,
                    file_path VARCHAR(500) NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (validation_session_id) REFERENCES validation_sessions(id)
                )
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
    
    def create_upload_record(self, filename: str, file_path: str, file_size: int, 
                           sheet_name: Optional[str] = None, variables: Optional[List[str]] = None) -> int:
        """Create a new upload record"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            variables_json = json.dumps(variables) if variables else None
            
            cursor.execute('''
                INSERT INTO uploads (filename, file_path, file_size, sheet_name, variables_json)
                VALUES (?, ?, ?, ?, ?)
            ''', (filename, file_path, file_size, sheet_name, variables_json))
            
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
    
    def create_validation_session(self, upload_id: int, categorization: Dict[str, Any]) -> int:
        """Create a new validation session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            categorization_json = json.dumps(categorization)
            
            cursor.execute('''
                INSERT INTO validation_sessions (upload_id, categorization_json)
                VALUES (?, ?)
            ''', (upload_id, categorization_json))
            
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
    
    def create_export_record(self, session_id: int, export_type: str, file_path: str) -> int:
        """Create a new export record"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO exports (validation_session_id, export_type, file_path)
                VALUES (?, ?, ?)
            ''', (session_id, export_type, file_path))
            
            conn.commit()
            return cursor.lastrowid
    
    def get_export_record(self, export_id: int) -> Optional[Dict[str, Any]]:
        """Get export record by ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM exports WHERE id = ?', (export_id,))
            row = cursor.fetchone()
            
            return dict(row) if row else None
    
    def cleanup_old_records(self, days: int = 7):
        """Clean up old records (older than specified days)"""
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

# Global database manager instance
db_manager = DatabaseManager()