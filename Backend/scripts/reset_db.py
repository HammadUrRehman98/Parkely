from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

import psycopg2


def _read_database_url(backend_dir: Path) -> str:
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if database_url:
        return database_url

    env_path = backend_dir / ".env"
    if not env_path.exists():
        return ""

    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if not line.startswith("DATABASE_URL="):
            continue
        return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def _to_psycopg2_dsn(database_url: str) -> str:

    return re.sub(r"^postgresql\+psycopg2://", "postgresql://", database_url)


def main() -> int:
    backend_dir = Path(__file__).resolve().parents[1]
    database_url = _read_database_url(backend_dir)
    if not database_url:
        print("ERROR: DATABASE_URL not set and Backend/.env missing DATABASE_URL.", file=sys.stderr)
        return 2

    dsn = _to_psycopg2_dsn(database_url)

    print("About to RESET the database schema (public) at:")
    print(f"  {dsn}")
    print()
    confirm = input("This will DELETE ALL DATA. Type RESET to continue: ").strip()
    if confirm != "RESET":
        print("Cancelled.")
        return 1

    print("Dropping & recreating schema (public)...")
    conn = psycopg2.connect(dsn)
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("DROP SCHEMA public CASCADE;")
            cur.execute("CREATE SCHEMA public;")
    finally:
        conn.close()

    print("Running migrations...")
    subprocess.check_call(["alembic", "upgrade", "head"], cwd=str(backend_dir))

    print("Done. Database is now a clean, freshly migrated schema.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
