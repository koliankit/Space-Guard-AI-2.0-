"""
SQLite database setup via SQLAlchemy. Lightweight, file-based storage
appropriate for a prototype (see README for swapping to Postgres later —
only DATABASE_URL needs to change).
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./spaceguard.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from models import orm_models  # noqa: F401 (ensures models are registered)
    Base.metadata.create_all(bind=engine)

    # Auto-migrate any newly added columns for SQLite
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        for table_name, table in Base.metadata.tables.items():
            if table_name in existing_tables:
                existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
                for col in table.columns:
                    if col.name not in existing_cols:
                        col_type = col.type.compile(engine.dialect)
                        with engine.begin() as conn:
                            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type}"))
    except Exception as e:
        print(f"Warning during auto-migration: {e}")
