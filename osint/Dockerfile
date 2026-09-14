# osint/Dockerfile — Celery worker + beat image
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy the osint package (celery_app.py, tasks.py, __init__.py)
COPY . ./osint/

# Run with either:
#   celery -A osint.celery_app worker --loglevel=info
#   celery -A osint.celery_app beat   --loglevel=info
# (the compose file sets the command accordingly)

CMD ["celery", "-A", "osint.celery_app", "worker", "--loglevel=info"]
