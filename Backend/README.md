# Parkely Backend

FastAPI + PostgreSQL backend for the Parkely smart parking system.

## Setup

1. Create a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env` and update:
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `BACKEND_CORS_ORIGINS`

4. Run migrations:

```bash
alembic upgrade head
```

5. Optional: create tables directly for a fresh local database:

```bash
python -m app.db.init_db
```

6. Start the API:

```bash
uvicorn app.main:app --reload
```

## Current API

- `GET /health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/verify-email-otp`
- `POST /api/v1/auth/resend-email-otp`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/admin-check`

## Email verification flow

- Registration creates a pending account.
- A 6-digit OTP is sent through Resend.
- Login and authenticated routes are blocked until the email is verified.
- Users can verify with the OTP endpoint or request a new OTP through the resend endpoint.

## Notes

- Public registration creates a `user` account.
- Admin access is supported through JWT role checks.
- A bootstrap admin can be created by setting `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` in `.env`.
