require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// origin:true reflects the caller's origin, which sendBeacon (credentialed) requires.
app.use(cors({ origin: true, credentials: true }));
// The tracker posts JSON as text/plain to avoid CORS preflight, so parse both.
app.use(express.json({ type: ['application/json', 'text/plain'], limit: '100kb' }));

// Serve the tracker script and the demo pages from the same server.
app.use('/tracker.js', express.static(path.join(__dirname, '../tracker/tracker.js')));
app.use('/demo', express.static(path.join(__dirname, '../demo')));

app.use('/api', require('./routes/api'));
app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
const URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/analytics';

mongoose
  .connect(URI)
  .then(() => app.listen(PORT, () => console.log(`API + demo on http://localhost:${PORT}`)))
  .catch((err) => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
