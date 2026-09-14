# bot/Dockerfile — PART 11.5
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY signal_bot.py .

# The server PUBLIC key is mounted read-only at /keys/server-pub.asc
# (see docker-compose.yml). It is safe to distribute — anyone can encrypt
# tips with it; only the offline private key can read them.

CMD ["python", "signal_bot.py"]
