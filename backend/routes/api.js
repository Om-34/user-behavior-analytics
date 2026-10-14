const router = require('express').Router();
const Event = require('../models/Event');

const NUM_FIELDS = ['x', 'y', 'page_w', 'page_h', 'viewport_w', 'viewport_h'];

function normalizePage(u) {
  try { const p = new URL(u); return p.origin + p.pathname; } catch (e) { return null; }
}

// Validate and shape one incoming event; returns null if invalid.
function clean(raw, userAgent) {
  if (!raw || typeof raw !== 'object') return null;
  const { session_id, type, url, timestamp } = raw;
  if (typeof session_id !== 'string' || !session_id || session_id.length > 100) return null;
  if (!['page_view', 'click'].includes(type)) return null;
  if (typeof url !== 'string' || url.length > 2000) return null;
  const page = normalizePage(url);
  const ts = new Date(timestamp);
  if (!page || isNaN(ts.getTime())) return null;

  const doc = { session_id, type, url, page, timestamp: ts, user_agent: userAgent };
  if (type === 'click') {
    if (!Number.isFinite(raw.x) || !Number.isFinite(raw.y)) return null;
    NUM_FIELDS.forEach((k) => { if (Number.isFinite(raw[k])) doc[k] = raw[k]; });
  }
  return doc;
}

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => { console.error(err); res.status(500).json({ error: 'Server error' }); });

// 1) Receive and store events (single event, array, or { events: [...] })
router.post('/events', wrap(async (req, res) => {
  const b = req.body;
  const list = Array.isArray(b) ? b : b && Array.isArray(b.events) ? b.events : [b];
  const docs = list.slice(0, 100).map((e) => clean(e, req.get('user-agent'))).filter(Boolean);
  if (!docs.length) return res.status(400).json({ error: 'No valid events in request' });
  await Event.insertMany(docs);
  res.status(201).json({ stored: docs.length });
}));

// 2) List sessions with event counts
router.get('/sessions', wrap(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const sessions = await Event.aggregate([
    { $group: {
        _id: '$session_id',
        total_events: { $sum: 1 },
        page_views: { $sum: { $cond: [{ $eq: ['$type', 'page_view'] }, 1, 0] } },
        clicks: { $sum: { $cond: [{ $eq: ['$type', 'click'] }, 1, 0] } },
        first_seen: { $min: '$timestamp' },
        last_seen: { $max: '$timestamp' }
    } },
    { $sort: { last_seen: -1 } },
    { $limit: limit },
    { $project: { _id: 0, session_id: '$_id', total_events: 1, page_views: 1, clicks: 1, first_seen: 1, last_seen: 1 } }
  ]);
  res.json(sessions);
}));

// 3) All events for one session, in order (the user journey)
router.get('/sessions/:id/events', wrap(async (req, res) => {
  const events = await Event.find({ session_id: req.params.id })
    .sort({ timestamp: 1, _id: 1 })
    .select('-user_agent')
    .lean();
  res.json(events);
}));

// Pages seen so far, for the heatmap page selector
router.get('/pages', wrap(async (req, res) => {
  const pages = await Event.aggregate([
    { $group: {
        _id: '$page',
        views: { $sum: { $cond: [{ $eq: ['$type', 'page_view'] }, 1, 0] } },
        clicks: { $sum: { $cond: [{ $eq: ['$type', 'click'] }, 1, 0] } }
    } },
    { $sort: { clicks: -1 } },
    { $project: { _id: 0, page: '$_id', views: 1, clicks: 1 } }
  ]);
  res.json(pages);
}));

// 4) Click data for one page (heatmap)
router.get('/heatmap', wrap(async (req, res) => {
  if (!req.query.url) return res.status(400).json({ error: 'url query parameter is required' });
  const page = normalizePage(req.query.url) || req.query.url;
  const clicks = await Event.find({ type: 'click', page })
    .select('x y page_w page_h viewport_w viewport_h timestamp session_id -_id')
    .limit(20000)
    .lean();
  res.json({ page, total: clicks.length, clicks });
}));

module.exports = router;
