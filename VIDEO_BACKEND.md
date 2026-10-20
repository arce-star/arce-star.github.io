# One-Prompt AI Video backend

The public GitHub Pages frontend never contains the Runway secret.

## Vercel environment variables

- `RUNWAYML_API_SECRET` — Runway Dev API secret.
- `VIDEO_ACCESS_TOKEN` — private passphrase used by the homepage to prevent public credit abuse.

## Endpoint

`POST /api/video`

Headers:

- `Content-Type: application/json`
- `X-Video-Token: <VIDEO_ACCESS_TOKEN>`

Actions:

```json
{"action":"generate","prompt":"...","duration":10,"ratio":"1280:720","audio":true}
```

```json
{"action":"status","id":"<runway-task-id>"}
```

The backend calls Runway Multi-Shot Video Recipe (`version: 2026-06`, `mode: auto`).
