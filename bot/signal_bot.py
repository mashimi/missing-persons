# bot/signal_bot.py
# PART 11.4 — Signal bot for anonymous tips.
#
# Flow (see PART 11.1 architecture):
#   tipster → Signal → signal-cli-rest-api → this bot → PGP encrypt → FastAPI
#
# Privacy properties:
#   * Tip text is encrypted with the SERVER public key before it is sent to
#     the API; the API stores only the ciphertext.
#   * The tipster's phone number is never sent anywhere: only a SHA-256
#     hash (truncated) is attached as sender_hint.
#   * "STOP" opts a sender out permanently (locally).
import hashlib
import json
import logging
import os
import time
from pathlib import Path

import requests
from pgpy import PGPKey, PGPMessage

SIGNAL_API = os.getenv("SIGNAL_API", "http://127.0.0.1:8080")
BOT_NUMBER = os.getenv("BOT_NUMBER", "")
FASTAPI_URL = os.getenv("FASTAPI_URL", "http://127.0.0.1:8000")
POLL_SECONDS = int(os.getenv("POLL_SECONDS", "5"))
KEY_PATH = Path(os.getenv("PGP_PUBLIC_KEY_FILE", "/keys/server-pub.asc"))
OPTOUT_FILE = Path(os.getenv("OPTOUT_FILE", "/data/optout.json"))

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
)
log = logging.getLogger("signal-bot")

HELP_TEXT = (
    "Missing Persons Registry — anonymous tip line\n"
    "\n"
    "Send a tip any time. Include:\n"
    " • full name of the missing person\n"
    " • when and where they were last seen\n"
    " • what happened\n"
    " • optional: photo, age, description\n"
    "\n"
    "Your message is encrypted before it is stored. You do not need to\n"
    "give your name. Commands:\n"
    "  HELP  — this message\n"
    "  STOP  — stop receiving messages from us\n"
)

RATE_LIMIT = int(os.getenv("RATE_LIMIT_PER_HOUR", "10"))
_rate: dict[str, list[float]] = {}


def load_public_key() -> PGPKey:
    with KEY_PATH.open("r", encoding="utf-8") as fh:
        key, _ = PGPKey.from_blob(fh.read())
    return key


PUBLIC_KEY = load_public_key()


def load_optout() -> set:
    try:
        return set(json.loads(OPTOUT_FILE.read_text()))
    except (OSError, ValueError):
        return set()


def save_optout(numbers: set) -> None:
    OPTOUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OPTOUT_FILE.write_text(json.dumps(sorted(numbers)))


OPTOUT = load_optout()


def encrypt_tip(plain_text: str) -> str:
    message = PGPMessage.new(plain_text)
    ciphertext = PUBLIC_KEY.encrypt(message)
    return str(ciphertext)


def sender_hash(number: str) -> str:
    return hashlib.sha256(number.encode()).hexdigest()[:16]


def rate_limited(number: str) -> bool:
    now = time.time()
    window = _rate.setdefault(number, [])
    _rate[number] = [t for t in window if now - t < 3600]
    if len(_rate[number]) >= RATE_LIMIT:
        return True
    _rate[number].append(now)
    return False


def send_reply(recipient: str, text: str) -> None:
    try:
        requests.post(
            f"{SIGNAL_API}/v2/send",
            json={
                "number": BOT_NUMBER,
                "recipients": [recipient],
                "message": text,
            },
            timeout=15,
        )
    except requests.RequestException as exc:
        log.warning("Could not send reply to %s…: %s", recipient[-4:], exc)


def forward_to_api(recipient: str, tip_text: str) -> bool:
    payload = {
        "encrypted_blob": encrypt_tip(tip_text),
        "source": "signal",
        "sender_hint": sender_hash(recipient),
    }
    try:
        res = requests.post(
            f"{FASTAPI_URL}/api/reports", json=payload, timeout=20
        )
        return res.status_code in (200, 202)
    except requests.RequestException as exc:
        log.error("API unreachable: %s", exc)
        return False


def handle_message(sender: str, text: str) -> None:
    """Process one incoming plaintext Signal message."""
    global OPTOUT

    stripped = text.strip()

    # Commands (case-insensitive)
    if stripped.upper() in ("HELP", "START", "INFO"):
        send_reply(sender, HELP_TEXT)
        return

    if stripped.upper() == "STOP":
        OPTOUT.add(sender)
        save_optout(OPTOUT)
        send_reply(sender, "You will not receive any more messages.")
        log.info("Opt-out stored for a sender (not logged by number)")
        return

    if sender in OPTOUT:
        return

    if rate_limited(sender):
        send_reply(sender, "Too many messages this hour. Try again later.")
        return

    if len(stripped) < 10:
        send_reply(sender, HELP_TEXT)
        return

    if forward_to_api(sender, stripped):
        send_reply(
            sender,
            "✅ Thank you. Your tip was received and encrypted. "
            "A case reference will appear once it is verified.",
        )
        log.info("Tip stored (encrypted %d bytes)", len(stripped))
    else:
        send_reply(
            sender,
            "⚠️ The registry could not receive your tip right now. "
            "Please try again in a few minutes.",
        )


def fetch_messages() -> list:
    """Pull new messages from signal-cli-rest-api."""
    try:
        res = requests.get(
            f"{SIGNAL_API}/v1/receive",
            params={"number": BOT_NUMBER},
            timeout=15,
        )
        if res.status_code != 200:
            log.warning("receive failed: %s %s", res.status_code, res.text[:200])
            return []
        return res.json()
    except requests.RequestException as exc:
        log.warning("signal-cli-rest-api unreachable: %s", exc)
        return []


def main() -> None:
    if not BOT_NUMBER:
        raise SystemExit("BOT_NUMBER env var is required")

    log.info("Signal bot polling %s (number …%s)", SIGNAL_API, BOT_NUMBER[-4:])

    while True:
        for envelope in fetch_messages():
            # signal-cli-rest-api envelope shape:
            # { envelope: { source, sourceNumber, syncMessage?, dataMessage? } }
            env = envelope.get("envelope", {})
            sender = env.get("sourceNumber") or env.get("source") or ""
            if not sender:
                continue

            data = env.get("dataMessage") or {}
            text = data.get("message", "")
            if not text:
                continue

            if sender in OPTOUT:
                continue

            handle_message(sender, text)

        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()

