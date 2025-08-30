"""
Session Management System for Validador de Instrumentos
Implements institutional key authentication with session-based isolation
"""
import sqlite3
import secrets
import os
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from contextlib import contextmanager


class SessionManager:
    """
    Manages secure sessions with institutional key authentication.
    Each session is isolated and expires after 24 hours.
    """
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.institutional_key = os.environ.get('INSTITUTIONAL_ACCESS_KEY')
        if not self.institutional_key:
            raise ValueError("INSTITUTIONAL_ACCESS_KEY environment variable must be set")
        
        self.init_session_tables()
    
    @contextmanager
    def get_connection(self):
        """Database connection context manager"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def init_session_tables(self):
        """Initialize session-related tables"""
        with self.get_connection() as conn:
            # Active sessions table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS active_sessions (
                    session_id VARCHAR(64) PRIMARY KEY,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME NOT NULL,
                    client_ip VARCHAR(45),
                    user_agent TEXT,
                    is_active BOOLEAN DEFAULT 1
                )
            ''')
            
            # Indices for performance optimization
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_sessions_expires ON active_sessions(expires_at)
            ''')
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_sessions_active ON active_sessions(is_active)
            ''')
            
            conn.commit()
    
    def validate_institutional_key(self, provided_key: str) -> bool:
        """
        Validate provided institutional access key
        
        Args:
            provided_key: The key provided by the user
            
        Returns:
            bool: True if key is valid, False otherwise
        """
        return provided_key == self.institutional_key
    
    def create_session(self, client_ip: str, user_agent: str, session_duration_hours: int = 24) -> str:
        """
        Create new session and return session_id
        
        Args:
            client_ip: Client IP address
            user_agent: Client User-Agent string
            session_duration_hours: Session duration in hours (default 24)
            
        Returns:
            str: Unique session ID
        """
        # Generate secure session ID
        session_id = f"sess_{secrets.token_urlsafe(32)}"
        expires_at = datetime.utcnow() + timedelta(hours=session_duration_hours)
        
        with self.get_connection() as conn:
            conn.execute('''
                INSERT INTO active_sessions (session_id, expires_at, client_ip, user_agent)
                VALUES (?, ?, ?, ?)
            ''', (session_id, expires_at, client_ip, user_agent))
            conn.commit()
        
        return session_id
    
    def validate_session(self, session_id: str) -> bool:
        """
        Check if session is valid and active
        
        Args:
            session_id: Session ID to validate
            
        Returns:
            bool: True if session is valid and active, False otherwise
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT session_id FROM active_sessions 
                WHERE session_id = ? AND expires_at > datetime('now') AND is_active = 1
            ''', (session_id,))
            
            session = cursor.fetchone()
            
            if session:
                # Update last activity timestamp
                cursor.execute('''
                    UPDATE active_sessions 
                    SET last_activity = CURRENT_TIMESTAMP 
                    WHERE session_id = ?
                ''', (session_id,))
                conn.commit()
                return True
            
            return False
    
    def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session information
        
        Args:
            session_id: Session ID to get info for
            
        Returns:
            Dict[str, Any] or None: Session information if found, None otherwise
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM active_sessions WHERE session_id = ?
            ''', (session_id,))
            
            session = cursor.fetchone()
            return dict(session) if session else None
    
    def invalidate_session(self, session_id: str) -> bool:
        """
        Invalidate a specific session
        
        Args:
            session_id: Session ID to invalidate
            
        Returns:
            bool: True if session was found and invalidated, False otherwise
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE active_sessions SET is_active = 0 WHERE session_id = ?
            ''', (session_id,))
            conn.commit()
            return cursor.rowcount > 0
    
    def cleanup_expired_sessions(self) -> int:
        """
        Remove expired sessions and return count of removed sessions
        
        Returns:
            int: Number of expired sessions removed
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Count expired sessions before deletion
            cursor.execute('''
                SELECT COUNT(*) as count FROM active_sessions 
                WHERE expires_at < datetime('now') OR is_active = 0
            ''')
            expired_count = cursor.fetchone()['count']
            
            # Delete expired sessions
            cursor.execute('''
                DELETE FROM active_sessions 
                WHERE expires_at < datetime('now') OR is_active = 0
            ''')
            conn.commit()
            
            return expired_count
    
    def get_active_sessions_count(self) -> int:
        """
        Get count of currently active sessions
        
        Returns:
            int: Number of active sessions
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT COUNT(*) as count FROM active_sessions 
                WHERE expires_at > datetime('now') AND is_active = 1
            ''')
            return cursor.fetchone()['count']
    
    def extend_session(self, session_id: str, additional_hours: int = 24) -> bool:
        """
        Extend session expiration time
        
        Args:
            session_id: Session ID to extend
            additional_hours: Additional hours to extend (default 24)
            
        Returns:
            bool: True if session was found and extended, False otherwise
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            new_expiration = datetime.utcnow() + timedelta(hours=additional_hours)
            
            cursor.execute('''
                UPDATE active_sessions 
                SET expires_at = ?, last_activity = CURRENT_TIMESTAMP 
                WHERE session_id = ? AND is_active = 1
            ''', (new_expiration, session_id))
            conn.commit()
            
            return cursor.rowcount > 0
    
    def get_session_stats(self) -> Dict[str, Any]:
        """
        Get comprehensive session statistics for monitoring
        
        Returns:
            Dict[str, Any]: Session statistics
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Active sessions count
            cursor.execute('''
                SELECT COUNT(*) as count FROM active_sessions 
                WHERE expires_at > datetime('now') AND is_active = 1
            ''')
            active_count = cursor.fetchone()['count']
            
            # Total sessions created today
            cursor.execute('''
                SELECT COUNT(*) as count FROM active_sessions 
                WHERE DATE(created_at) = DATE('now')
            ''')
            today_count = cursor.fetchone()['count']
            
            # Expired sessions needing cleanup
            cursor.execute('''
                SELECT COUNT(*) as count FROM active_sessions 
                WHERE expires_at < datetime('now') OR is_active = 0
            ''')
            expired_count = cursor.fetchone()['count']
            
            # Sessions expiring in next hour
            cursor.execute('''
                SELECT COUNT(*) as count FROM active_sessions 
                WHERE expires_at BETWEEN datetime('now') AND datetime('now', '+1 hour')
                AND is_active = 1
            ''')
            expiring_soon_count = cursor.fetchone()['count']
            
            return {
                'active_sessions': active_count,
                'sessions_created_today': today_count,
                'expired_sessions_needing_cleanup': expired_count,
                'sessions_expiring_in_1_hour': expiring_soon_count,
                'last_updated': datetime.utcnow().isoformat()
            }