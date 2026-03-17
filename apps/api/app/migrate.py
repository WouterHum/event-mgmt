"""
MySQL-compatible migration script.
Run from apps/api: python migrate.py
"""
import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://user:password@localhost/dbname")
engine = create_engine(DATABASE_URL)


def column_exists(conn, table, column):
    result = conn.execute(text("""
        SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :table
          AND COLUMN_NAME = :column
    """), {"table": table, "column": column})
    return result.scalar() > 0


def table_exists(conn, table):
    result = conn.execute(text("""
        SELECT COUNT(*) FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :table
    """), {"table": table})
    return result.scalar() > 0


def run():
    with engine.connect() as conn:

        # ── FIX #1: event_rooms junction table ──────────────────────────────
        if not table_exists(conn, "event_rooms"):
            conn.execute(text("""
                CREATE TABLE event_rooms (
                    event_id INT NOT NULL,
                    room_id  INT NOT NULL,
                    PRIMARY KEY (event_id, room_id),
                    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
                    FOREIGN KEY (room_id)  REFERENCES rooms(id)  ON DELETE CASCADE
                )
            """))
            conn.commit()
            print("✓ Created table: event_rooms")
        else:
            print("  Skipped: event_rooms already exists")

        # ── FIX #2: sessions table (room time slots) ─────────────────────────
        if not table_exists(conn, "sessions"):
            conn.execute(text("""
                CREATE TABLE sessions (
                    id           INT AUTO_INCREMENT PRIMARY KEY,
                    event_id     INT NOT NULL,
                    room_id      INT NOT NULL,
                    speaker_id   INT,
                    session_name VARCHAR(255) NOT NULL,
                    start_time   DATETIME NOT NULL,
                    end_time     DATETIME NOT NULL,
                    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (event_id)   REFERENCES events(id)   ON DELETE CASCADE,
                    FOREIGN KEY (room_id)    REFERENCES rooms(id)    ON DELETE CASCADE,
                    FOREIGN KEY (speaker_id) REFERENCES speakers(id) ON DELETE SET NULL
                )
            """))
            conn.commit()
            print("✓ Created table: sessions")
        else:
            print("  Skipped: sessions already exists")

        # ── FIX #3/#4/#5: new columns on uploads ────────────────────────────
        new_columns = [
            ("session_id",              "INT",                     "NULL"),
            ("own_machine",             "TINYINT(1)",              "NOT NULL DEFAULT 0"),
            ("no_ppt",                  "TINYINT(1)",              "NOT NULL DEFAULT 0"),
            ("has_video_with_audio",    "TINYINT(1)",              "NOT NULL DEFAULT 0"),
            ("has_video_without_audio", "TINYINT(1)",              "NOT NULL DEFAULT 0"),
            ("has_audio_only",          "TINYINT(1)",              "NOT NULL DEFAULT 0"),
        ]

        for col_name, col_type, col_opts in new_columns:
            if not column_exists(conn, "uploads", col_name):
                conn.execute(text(
                    f"ALTER TABLE uploads ADD COLUMN {col_name} {col_type} {col_opts}"
                ))
                conn.commit()
                print(f"✓ Added column: uploads.{col_name}")
            else:
                print(f"  Skipped: uploads.{col_name} already exists")

        # ── Add FK for uploads.session_id after column exists ───────────────
        fk_check = conn.execute(text("""
            SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'uploads'
              AND COLUMN_NAME = 'session_id'
              AND REFERENCED_TABLE_NAME = 'sessions'
        """))
        if fk_check.scalar() == 0:
            try:
                conn.execute(text("""
                    ALTER TABLE uploads
                    ADD CONSTRAINT fk_uploads_session
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
                """))
                conn.commit()
                print("✓ Added FK: uploads.session_id -> sessions.id")
            except Exception as e:
                print(f"  Could not add FK (non-critical): {e}")
        else:
            print("  Skipped: FK uploads.session_id already exists")

    print("\nMigration complete.")


if __name__ == "__main__":
    run()