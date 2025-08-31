"""
Automatic Data Cleanup Scheduler
Handles periodic cleanup of expired sessions and files
"""
import schedule
import time
import threading
from datetime import datetime
from app.core.database import db_manager
from app.core.services.session_service import SessionManager


def cleanup_expired_data():
    """
    Main cleanup function that removes expired sessions and associated data
    This function is called periodically by the scheduler
    """
    try:
        print(f"🧹 Starting automated cleanup at {datetime.now().isoformat()}")
        
        # Initialize managers
        session_manager = SessionManager(db_manager.db_path)
        
        # Cleanup expired sessions
        print("🗂️  Cleaning up expired sessions...")
        expired_sessions = session_manager.cleanup_expired_sessions()
        
        # Cleanup expired data files
        print("📁 Cleaning up expired data files...")
        cleanup_stats = db_manager.cleanup_expired_data()
        
        # Log cleanup results
        total_cleaned = (expired_sessions + 
                        cleanup_stats.get('deleted_uploads', 0) + 
                        cleanup_stats.get('deleted_validation_sessions', 0) + 
                        cleanup_stats.get('deleted_exports', 0))
        
        print("✅ Cleanup completed successfully:")
        print(f"   📋 Expired sessions removed: {expired_sessions}")
        print(f"   📄 Files deleted: {cleanup_stats.get('deleted_files', 0)}")
        print(f"   🗂️  Upload records deleted: {cleanup_stats.get('deleted_uploads', 0)}")
        print(f"   🔬 Validation sessions deleted: {cleanup_stats.get('deleted_validation_sessions', 0)}")
        print(f"   📊 Export records deleted: {cleanup_stats.get('deleted_exports', 0)}")
        print(f"   🎯 Total items cleaned: {total_cleaned}")
        
        # Get current active session stats for monitoring
        active_stats = session_manager.get_session_stats()
        print(f"📊 Active sessions after cleanup: {active_stats.get('active_sessions', 0)}")
        
        return {
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'expired_sessions_cleaned': expired_sessions,
            'data_cleanup_stats': cleanup_stats,
            'total_items_cleaned': total_cleaned,
            'active_sessions_remaining': active_stats.get('active_sessions', 0)
        }
        
    except Exception as e:
        error_msg = f"❌ Error during automated cleanup: {str(e)}"
        print(error_msg)
        
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }


def cleanup_with_detailed_logging():
    """
    Wrapper for cleanup_expired_data with detailed logging for debugging
    """
    print("\n" + "="*60)
    print("🕒 SCHEDULED CLEANUP STARTING")
    print("="*60)
    
    result = cleanup_expired_data()
    
    print("="*60)
    print("🕒 SCHEDULED CLEANUP COMPLETED")
    print("="*60 + "\n")
    
    return result


def manual_cleanup():
    """
    Manual cleanup function that can be called directly
    Returns detailed results for API responses
    """
    print("🔧 Manual cleanup initiated")
    return cleanup_expired_data()


def emergency_cleanup():
    """
    Emergency cleanup function that removes ALL expired data immediately
    This is more aggressive than the regular cleanup
    """
    try:
        print("🚨 EMERGENCY CLEANUP INITIATED")
        print("This will remove ALL expired data immediately")
        
        # Run regular cleanup first
        regular_result = cleanup_expired_data()
        
        # Additional emergency cleanup - remove old records beyond normal expiration
        print("🧹 Running additional emergency cleanup...")
        
        # Clean up records older than 1 day (more aggressive than usual 24-hour expiration)
        db_manager.cleanup_old_records(days=1)
        
        print("✅ Emergency cleanup completed")
        
        return {
            'success': True,
            'type': 'emergency',
            'timestamp': datetime.now().isoformat(),
            'regular_cleanup': regular_result
        }
        
    except Exception as e:
        error_msg = f"❌ Emergency cleanup failed: {str(e)}"
        print(error_msg)
        
        return {
            'success': False,
            'type': 'emergency',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }


def start_cleanup_scheduler():
    """
    Initialize and start the background cleanup scheduler
    
    Schedule:
    - Every hour: Regular cleanup of expired sessions and data
    - Every 6 hours: More thorough cleanup with detailed logging
    - Daily at 2 AM: Deep cleanup of old records
    """
    
    # Schedule regular cleanup every hour
    schedule.every().hour.do(cleanup_expired_data)
    
    # Schedule detailed cleanup every 6 hours
    schedule.every(6).hours.do(cleanup_with_detailed_logging)
    
    # Schedule daily deep cleanup at 2 AM
    schedule.every().day.at("02:00").do(lambda: db_manager.cleanup_old_records(days=7))
    
    def run_scheduler():
        """Background scheduler thread function"""
        print("🕒 Cleanup scheduler thread started")
        
        while True:
            try:
                schedule.run_pending()
                time.sleep(60)  # Check every minute for scheduled tasks
                
            except Exception as e:
                print(f"⚠️  Scheduler error (will continue): {str(e)}")
                time.sleep(300)  # Wait 5 minutes before retrying on error
    
    # Start scheduler in background thread
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    
    print("✅ Automated cleanup scheduler started:")
    print("   ⏰ Every hour: Regular cleanup")
    print("   ⏰ Every 6 hours: Detailed cleanup")
    print("   ⏰ Daily at 2 AM: Deep cleanup (7+ day old records)")


def get_cleanup_schedule():
    """
    Get information about the current cleanup schedule
    """
    jobs = schedule.jobs
    
    schedule_info = {
        'active_jobs': len(jobs),
        'schedule': [
            {
                'function': 'cleanup_expired_data',
                'interval': 'Every hour',
                'description': 'Remove expired sessions and data files'
            },
            {
                'function': 'cleanup_with_detailed_logging', 
                'interval': 'Every 6 hours',
                'description': 'Detailed cleanup with comprehensive logging'
            },
            {
                'function': 'cleanup_old_records',
                'interval': 'Daily at 2:00 AM',
                'description': 'Deep cleanup of records older than 7 days'
            }
        ],
        'next_run': str(schedule.next_run()) if jobs else None
    }
    
    return schedule_info


def stop_cleanup_scheduler():
    """
    Stop the cleanup scheduler (for testing or shutdown)
    """
    schedule.clear()
    print("🛑 Cleanup scheduler stopped")


# Health check function for monitoring
def get_cleanup_health():
    """
    Get health status of the cleanup system
    """
    try:
        session_manager = SessionManager(db_manager.db_path)
        stats = session_manager.get_session_stats()
        
        # Check if there are too many expired sessions (indicates cleanup issues)
        expired_sessions = stats.get('expired_sessions_needing_cleanup', 0)
        active_sessions = stats.get('active_sessions', 0)
        
        health_status = 'healthy'
        warnings = []
        
        if expired_sessions > 50:
            health_status = 'warning'
            warnings.append(f'High number of expired sessions needing cleanup: {expired_sessions}')
        
        if expired_sessions > 200:
            health_status = 'critical'
            warnings.append('Critical: Cleanup system may not be functioning properly')
        
        return {
            'status': health_status,
            'active_sessions': active_sessions,
            'expired_sessions_needing_cleanup': expired_sessions,
            'warnings': warnings,
            'last_check': datetime.now().isoformat(),
            'scheduler_jobs': len(schedule.jobs)
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'last_check': datetime.now().isoformat()
        }