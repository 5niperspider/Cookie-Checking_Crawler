@echo off
REM Load .env file
for /f "delims== tokens=1,2" %%A in (.env) do set %%A=%%B

echo Starting database container...
docker compose up -d db

echo Waiting for database to be ready...
timeout /t 5 /nobreak

echo Initializing database with user: %POSTGRES_USER%
docker exec -i cookie-db psql -U "%POSTGRES_USER%" -d "%POSTGRES_DB%" -f /docker-entrypoint-initdb.d/init.sql

echo Database initialization complete!
pause
