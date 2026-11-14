
import sqlite3
from pathlib import Path
from contextlib import contextmanager

# Database location
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "finance.db"

# Initial spending categories
DEFAULT_CATEGORIES = [
    "Smoking",
    "Alcohol",
    "Food",
    "Clothes & Household",
    "Bills",
    "Rent",
    "Travel",
    "Business"
]


@contextmanager
def get_connection():
    """Open and safely close a database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def initialise_database():
    """Create database tables and initialise default categories."""
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                amount_pence INTEGER NOT NULL,
                category TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                active INTEGER NOT NULL DEFAULT 1
            )
        """)

        for category in DEFAULT_CATEGORIES:
            conn.execute(
                "INSERT OR IGNORE INTO categories (name) VALUES (?)",
                (category,)
            )


def add_transaction(date, amount_pence, category):
    """Save a new expenditure transaction."""
    with get_connection() as conn:
        cursor = conn.execute("""
            INSERT INTO transactions (date, amount_pence, category)
            VALUES (?, ?, ?)
        """, (date, amount_pence, category))

        return cursor.lastrowid


def get_recent_transactions(limit=5):
    """Return the most recent transactions."""
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT * FROM transactions
            ORDER BY date DESC, id DESC
            LIMIT ?
        """, (limit,)).fetchall()

        return [dict(row) for row in rows]


def get_categories():
    """Return all active spending categories."""
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT name FROM categories
            WHERE active = 1
            ORDER BY name
        """).fetchall()

        return [row["name"] for row in rows]


def add_category(name):
    """Add a new spending category."""
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO categories (name)
            VALUES (?)
        """, (name.strip(),))


def delete_transaction(transaction_id):
    """Delete a transaction by its ID."""
    with get_connection() as conn:
        conn.execute("""
            DELETE FROM transactions
            WHERE id = ?
        """, (transaction_id,))


def update_transaction(transaction_id, date, amount_pence, category):
    """Update an existing transaction."""
    with get_connection() as conn:
        conn.execute("""
            UPDATE transactions
            SET date = ?, amount_pence = ?, category = ?
            WHERE id = ?
        """, (date, amount_pence, category, transaction_id))
