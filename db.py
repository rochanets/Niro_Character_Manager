import os
import sqlite3
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "niro.db")
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")

SCHEMA = """
CREATE TABLE IF NOT EXISTS regions (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
);
CREATE TABLE IF NOT EXISTS affiliations (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
);
CREATE TABLE IF NOT EXISTS elements (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL UNIQUE COLLATE NOCASE,
    image TEXT
);
CREATE TABLE IF NOT EXISTS weapons (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL UNIQUE COLLATE NOCASE,
    image TEXT
);
CREATE TABLE IF NOT EXISTS characters (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL UNIQUE COLLATE NOCASE,
    region_id      INTEGER REFERENCES regions(id),
    affiliation_id INTEGER REFERENCES affiliations(id),
    age            TEXT,
    height         TEXT,
    element_id     INTEGER REFERENCES elements(id),
    weapon_id      INTEGER REFERENCES weapons(id),
    rarity         INTEGER NOT NULL CHECK (rarity IN (4, 5)),
    dom            TEXT,
    normal_attack  TEXT,
    skill1         TEXT,
    skill2         TEXT,
    ultimate       TEXT,
    personality    TEXT,
    profession     TEXT,
    lore           TEXT,
    role1          TEXT,
    role2          TEXT,
    card_full      TEXT,
    card_promo     TEXT,
    archived       INTEGER NOT NULL DEFAULT 0,
    archived_at    TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS versions (
    major INTEGER PRIMARY KEY,
    name  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS banners (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    major      INTEGER NOT NULL CHECK (major BETWEEN 1 AND 8),
    minor      INTEGER NOT NULL CHECK (minor BETWEEN 0 AND 8),
    type       TEXT NOT NULL CHECK (type IN ('unitario', 'duplo', 'especial')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (major, minor)
);
CREATE TABLE IF NOT EXISTS banner_characters (
    banner_id    INTEGER NOT NULL REFERENCES banners(id) ON DELETE CASCADE,
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE (banner_id, character_id)
);
CREATE TABLE IF NOT EXISTS teams (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL UNIQUE COLLATE NOCASE,
    gradient_mode INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS team_members (
    team_id      INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    slot         INTEGER NOT NULL CHECK (slot BETWEEN 0 AND 3),
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE (team_id, slot),
    UNIQUE (character_id)
);
"""


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    for sub in ("characters", "elements", "weapons"):
        os.makedirs(os.path.join(UPLOAD_DIR, sub), exist_ok=True)
    conn = get_db()
    conn.executescript(SCHEMA)
    existing = {row[1] for row in conn.execute("PRAGMA table_info(characters)")}
    for col in ("role1", "role2"):
        if col not in existing:
            conn.execute(f"ALTER TABLE characters ADD COLUMN {col} TEXT")
    conn.commit()
    conn.close()


def purge_expired_archive():
    """Remove definitivamente personagens arquivados ha mais de 30 dias."""
    cutoff = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")
    conn = get_db()
    rows = conn.execute(
        "SELECT id, card_full, card_promo FROM characters "
        "WHERE archived = 1 AND archived_at IS NOT NULL AND archived_at < ?",
        (cutoff,),
    ).fetchall()
    for row in rows:
        for rel in (row["card_full"], row["card_promo"]):
            delete_upload(rel)
        conn.execute("DELETE FROM characters WHERE id = ?", (row["id"],))
    conn.commit()
    conn.close()
    return len(rows)


def delete_upload(rel_path):
    if not rel_path:
        return
    path = os.path.join(BASE_DIR, "static", rel_path.replace("/", os.sep))
    if os.path.isfile(path):
        try:
            os.remove(path)
        except OSError:
            pass
