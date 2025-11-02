import sqlite3
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import os

# Use data directory if it exists (Docker), otherwise use current directory
DB_PATH = 'data/time_tracker.db' if os.path.exists('data') else 'time_tracker.db'

def init_db():
    """Initialize the database and create tables if they don't exist."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('''
        CREATE TABLE IF NOT EXISTS time_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            start_time TEXT,
            end_time TEXT,
            hours REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL UNIQUE,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()

def get_entries_by_date(date: str) -> List[Dict]:
    """Get all time entries for a specific date."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('''
        SELECT id, date, start_time, end_time, hours
        FROM time_entries
        WHERE date = ?
        ORDER BY start_time
    ''', (date,))

    entries = []
    for row in c.fetchall():
        entries.append({
            'id': row[0],
            'date': row[1],
            'start_time': row[2],
            'end_time': row[3],
            'hours': row[4]
        })

    conn.close()
    return entries

def save_entries_for_date(date: str, entries: List[Dict]) -> bool:
    """Save time entries for a specific date. Replaces existing entries."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        # Delete existing entries for this date
        c.execute('DELETE FROM time_entries WHERE date = ?', (date,))

        # Insert new entries
        for entry in entries:
            c.execute('''
                INSERT INTO time_entries (date, start_time, end_time, hours)
                VALUES (?, ?, ?, ?)
            ''', (date, entry.get('start_time'), entry.get('end_time'), entry['hours']))

        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error saving entries: {e}")
        return False
    finally:
        conn.close()

def get_month_summary(year: int, month: int) -> Dict[str, float]:
    """Get total hours for each day in a month."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    month_str = f'{year}-{str(month).zfill(2)}'

    c.execute('''
        SELECT date, SUM(hours) as total_hours
        FROM time_entries
        WHERE date LIKE ?
        GROUP BY date
    ''', (f'{month_str}-%',))

    summary = {}
    for row in c.fetchall():
        summary[row[0]] = row[1]

    conn.close()
    return summary

def get_journal_entry(date: str) -> Optional[str]:
    """Get journal entry for a specific date."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('SELECT content FROM journal_entries WHERE date = ?', (date,))
    row = c.fetchone()

    conn.close()
    return row[0] if row else None

def save_journal_entry(date: str, content: str) -> bool:
    """Save or update journal entry for a specific date."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        c.execute('''
            INSERT INTO journal_entries (date, content, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(date) DO UPDATE SET
                content = excluded.content,
                updated_at = CURRENT_TIMESTAMP
        ''', (date, content))

        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error saving journal entry: {e}")
        return False
    finally:
        conn.close()

def seed_sample_data():
    """Add sample data starting from Oct 25, 2024."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Check if we already have data
    c.execute('SELECT COUNT(*) FROM time_entries')
    count = c.fetchone()[0]

    if count > 0:
        conn.close()
        return

    # Sample data from Oct 25 to Oct 31
    sample_entries = [
        ('2024-10-25', '9:00 AM', '12:00 PM', 3.0),
        ('2024-10-25', '1:00 PM', '5:00 PM', 4.0),
        ('2024-10-26', '8:30 AM', '4:30 PM', 8.0),
        ('2024-10-28', '10:00 AM', '2:00 PM', 4.0),
        ('2024-10-28', '3:00 PM', '6:00 PM', 3.0),
        ('2024-10-29', '9:00 AM', '5:00 PM', 8.0),
        ('2024-10-30', '8:00 AM', '12:00 PM', 4.0),
        ('2024-10-31', '9:00 AM', '1:00 PM', 4.0),
        ('2024-10-31', '2:00 PM', '5:30 PM', 3.5),
    ]

    for entry in sample_entries:
        c.execute('''
            INSERT INTO time_entries (date, start_time, end_time, hours)
            VALUES (?, ?, ?, ?)
        ''', entry)

    conn.commit()
    conn.close()
    print("Sample data seeded successfully!")
