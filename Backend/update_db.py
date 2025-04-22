import sqlite3
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def update_database_schema():
    """Update the database schema to add the image column to chat_history table."""
    db_path = os.path.join(os.path.dirname(__file__), "auth.db")
    
    if not os.path.exists(db_path):
        logger.error(f"Database file not found at: {db_path}")
        return False
    
    logger.info(f"Updating database schema at: {db_path}")
    
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if the image column already exists in the chat_history table
        cursor.execute("PRAGMA table_info(chat_history)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        if "image" not in column_names:
            logger.info("Adding 'image' column to chat_history table")
            # Add the image column
            cursor.execute("ALTER TABLE chat_history ADD COLUMN image TEXT")
            conn.commit()
            logger.info("Successfully added 'image' column to chat_history table")
        else:
            logger.info("The 'image' column already exists in chat_history table")
        
        # Close the connection
        conn.close()
        return True
    
    except sqlite3.Error as e:
        logger.error(f"SQLite error: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return False

if __name__ == "__main__":
    if update_database_schema():
        logger.info("Database schema update completed successfully")
    else:
        logger.error("Database schema update failed") 