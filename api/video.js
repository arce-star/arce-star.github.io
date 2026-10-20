const RUNWAY_BASE = 'https://api.dev.runwayml.com';
const RUNWAY_VERSION = '2024-11-06';
const ALLOWED_ORIGINS = new Set([
  'https://arce-star.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);

function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Video-Token');
  res.setHeader('Cache-Control', 'no-store');
}

function json(res, status, payload) { res.status(status).json(payload); }

function isAuthorized(req) {
  const expected = process.env.VIDEO_ACCESS_TOKEN || '';
  const got = String(req.headers['x-video-token'] || '');
  return !!expected && got === expected;
}

async function runway(path, init = {}) {
  const secret = process.env.RUNWAYML_API_SECRET;
  if (!secret) throw new Error('RUNWAYML_API_SECRET is not configured');
  const headers = {
    Authorization: `Bearer ${secret}`,
    'X-Runway-Version': RUNWAY_VERSION,
    ...(init.headers || {})
  };
  const resp = await fetch(`${RUNWAY_BASE}${path}`, { ...init, headers });
  const text = await resp.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!resp.ok) {
    const err = new Error(data?.error || data?.message || `Runway HTTP ${resp.status}`);
    err.status = resp.status;
    err.details = data;
    throw err;
  }
  return data;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  if (!isAuthorized(req)) return json(res, 401, { error: 'Invalid access token' });

  try {
    const body = req.body || {};
    const action = String(body.action || '');

    if (action === 'generate') {
      const prompt = String(body.prompt || '').trim();
      const duration = Number(body.duration || 10);
      const ratio = String(body.ratio || '1280:720');
      const audio = body.audio !== false;

      if (!prompt || prompt.length < 3) return json(res, 400, { error: 'Prompt is too short' });
      if (prompt.length > 2500) return json(res, 400, { error: 'Prompt must be <= 2500 characters' });
      if (![5, 10, 15].includes(duration)) return json(res, 400, { error: 'Duration must be 5, 10, or 15 seconds' });
      if (!['1280:720', '720:1280', '960:960', '1920:1080', '1080:1920', '1440:1440'].includes(ratio)) {
        return json(res, 400, { error: 'Unsupported ratio' });
      }

      const task = await runway('/v1/recipes/multi_shot_video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: '2026-06',
          mode: 'auto',
          prompt,
          duration,
          ratio,
          audio
        })
      });

      return json(res, 200, { id: task.id, status: task.status || 'PENDING' });
    }

    if (action === 'status') {
      const id = String(body.id || '').trim();
      if (!id) return json(res, 400, { error: 'Missing task id' });
      const task = await runway(`/v1/tasks/${encodeURIComponent(id)}`, { method: 'GET' });
      const payload = {
        id: task.id,
        status: task.status,
        createdAt: task.createdAt || null,
        failure: task.failure || task.failureCode || null
      };
      if (task.status === 'SUCCEEDED' && Array.isArray(task.output) && task.output[0]) payload.outputUrl = task.output[0];
      return json(res, 200, payload);
    }

    return json(res, 400, { error: 'Unknown action' });
  } catch (err) {
    console.error(err);
    return json(res, err.status || 500, {
      error: err.message || 'Internal error',
      details: err.details || undefined
    });
  }
}
