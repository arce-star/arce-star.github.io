from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

INTERVAL = "15m"
VISIBLE = 60
FUTURE = 20
LIMIT = VISIBLE + FUTURE

# Fixed historical windows so exercises stay reproducible.
WINDOWS = [
    ("BTCUSDT", "2025-02-03T08:00:00Z"),
    ("BTCUSDT", "2025-04-07T12:00:00Z"),
    ("BTCUSDT", "2025-08-24T00:00:00Z"),
    ("BTCUSDT", "2025-10-10T00:00:00Z"),
    ("ETHUSDT", "2025-03-15T12:00:00Z"),
    ("ETHUSDT", "2025-06-22T04:00:00Z"),
    ("ETHUSDT", "2025-11-21T09:00:00Z"),
    ("ETHUSDT", "2026-02-06T16:00:00Z"),
    ("SOLUSDT", "2025-04-10T00:00:00Z"),
    ("SOLUSDT", "2025-07-18T18:00:00Z"),
    ("SOLUSDT", "2026-01-05T14:00:00Z"),
    ("SOLUSDT", "2026-04-19T06:00:00Z"),
    ("BNBUSDT", "2025-05-12T03:00:00Z"),
    ("BNBUSDT", "2025-07-14T18:00:00Z"),
    ("BNBUSDT", "2025-12-03T12:00:00Z"),
    ("BNBUSDT", "2026-05-20T12:00:00Z"),
    ("DOGEUSDT", "2025-05-28T06:00:00Z"),
    ("DOGEUSDT", "2025-09-18T15:00:00Z"),
    ("DOGEUSDT", "2026-03-11T03:00:00Z"),
    ("DOGEUSDT", "2026-06-08T09:00:00Z"),
]

HOSTS = [
    "https://data-api.binance.vision",
    "https://api.binance.com",
]


def to_ms(iso: str) -> int:
    return int(datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp() * 1000)


def fetch_klines(symbol: str, start_iso: str):
    params = urllib.parse.urlencode(
        {
            "symbol": symbol,
            "interval": INTERVAL,
            "startTime": to_ms(start_iso),
            "limit": LIMIT,
        }
    )
    last_error = None
    for host in HOSTS:
        url = f"{host}/api/v3/klines?{params}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "arce-star-training-builder/1.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read().decode("utf-8"))
            if not isinstance(data, list) or len(data) < LIMIT:
                raise RuntimeError(f"unexpected response length from {host}: {len(data) if isinstance(data, list) else type(data)}")
            return data[:LIMIT], host
        except Exception as exc:  # noqa: BLE001
            last_error = exc
    raise RuntimeError(f"failed {symbol} {start_iso}: {last_error}")


def row(k):
    # Keep only fields needed by the browser. Timestamp is UTC ISO string.
    ts = datetime.fromtimestamp(int(k[0]) / 1000, tz=timezone.utc).isoformat().replace("+00:00", "Z")
    return [
        ts,
        float(k[1]),
        float(k[2]),
        float(k[3]),
        float(k[4]),
        float(k[5]),
    ]


def main():
    exercises = []
    used_hosts = set()
    for i, (symbol, start_iso) in enumerate(WINDOWS, 1):
        raw, host = fetch_klines(symbol, start_iso)
        used_hosts.add(host)
        bars = [row(k) for k in raw]
        exercises.append(
            {
                "id": f"{symbol.lower()}-{start_iso[:10]}-{i:02d}",
                "symbol": symbol,
                "interval": INTERVAL,
                "start": bars[0][0],
                "visible_count": VISIBLE,
                "future_count": FUTURE,
                "bars": bars,
            }
        )
        print(f"[{i:02d}/{len(WINDOWS)}] {symbol} {start_iso} via {host}")
        time.sleep(0.08)

    payload = {
        "schema": 1,
        "source": "Binance public Spot Kline API",
        "source_docs": "https://github.com/binance/binance-spot-api-docs/blob/master/faqs/market_data_only.md",
        "interval": INTERVAL,
        "visible_count": VISIBLE,
        "future_count": FUTURE,
        "fields": ["timestamp", "open", "high", "low", "close", "volume"],
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "hosts_used": sorted(used_hosts),
        "exercises": exercises,
    }

    out = Path("assets/data/crypto-real-kline-training.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {out} ({out.stat().st_size} bytes), exercises={len(exercises)}")


if __name__ == "__main__":
    main()
