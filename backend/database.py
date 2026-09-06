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
