# osint/celery_app.py
# PART 13.4 — Celery configuration + beat schedule.
import os

from celery import Celery
from celery.schedules import crontab

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

app = Celery(
    "osint",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["osint.tasks"],
)

app.conf.timezone = "UTC"
app.conf.worker_concurrency = 2
app.conf.task_default_queue = "osint"

# PART 15 schedule — automated enrichment
app.conf.beat_schedule = {
    # GDELT news scan every 6 h
    "scan-gdelt": {
        "task": "osint.tasks.scan_gdelt",
        "schedule": crontab(minute=0, hour="*/6"),
    },
    # Google News RSS every 6 h (offset so scans don't collide)
    "scan-google-news": {
        "task": "osint.tasks.scan_google_news",
        "schedule": crontab(minute=30, hour="*/6"),
    },
    # Geocoding (Nominatim) every 12 h
    "geocode-locations": {
        "task": "osint.tasks.geocode_locations",
        "schedule": crontab(minute=15, hour="*/12"),
    },
    # Fuzzy name matching daily at 03:00 UTC
    "fuzzy-match-names": {
        "task": "osint.tasks.fuzzy_match_names",
        "schedule": crontab(minute=0, hour=3),
    },
    # Signal alert digest daily at 07:00 UTC
    "daily-alert": {
        "task": "osint.tasks.send_daily_alert",
        "schedule": crontab(minute=0, hour=7),
    },
}
