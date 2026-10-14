'use client';
import { useEffect, useRef, useState } from 'react';
import { get } from '../lib/api';

const WIDTH = 900;
const median = (arr) => {
  const a = arr.filter(Boolean).sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : 0;
};

export default function Heatmap() {
  const [pages, setPages] = useState(null);
  const [page, setPage] = useState('');
  const [data, setData] = useState(null);
  const [mode, setMode] = useState('heat');
  const [error, setError] = useState('');
  const canvas = useRef(null);

  useEffect(() => {
    get('/api/pages')
      .then((p) => { setPages(p); if (p.length) setPage(p[0].page); })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!page) return;
    setData(null);
    get('/api/heatmap?url=' + encodeURIComponent(page)).then(setData).catch((e) => setError(e.message));
  }, [page]);

  // Draw: positions are stored in page pixels, so normalise against each click's own page size.
  useEffect(() => {
    if (!data || !canvas.current) return;
    const { clicks } = data;
    const refW = median(clicks.map((c) => c.page_w)) || 1;
    const refH = median(clicks.map((c) => c.page_h)) || 1;
    const height = Math.round(WIDTH * (refH / refW));
    const el = canvas.current;
    el.width = WIDTH; el.height = height;
    const ctx = el.getContext('2d');
    ctx.clearRect(0, 0, WIDTH, height);

    ctx.strokeStyle = '#e3e7ef'; ctx.lineWidth = 1;          // simple grid
    for (let x = 0; x <= WIDTH; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = 0; y <= height; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }

    clicks.forEach((c) => {
      const px = (c.x / (c.page_w || refW)) * WIDTH;
      const py = (c.y / (c.page_h || refH)) * height;
      if (mode === 'heat') {
        const g = ctx.createRadialGradient(px, py, 0, px, py, 36);
        g.addColorStop(0, 'rgba(232, 72, 20, 0.35)');
        g.addColorStop(1, 'rgba(232, 72, 20, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(px - 36, py - 36, 72, 72);
      } else {
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(47, 79, 208, 0.65)'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.stroke();
      }
    });
  }, [data, mode]);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Click heatmap</h2>
        <div className="controls">
          <label>
            Page{' '}
            <select value={page} onChange={(e) => setPage(e.target.value)} disabled={!pages || !pages.length}>
              {(pages || []).map((p) => (
                <option key={p.page} value={p.page}>{p.page} ({p.clicks} clicks)</option>
              ))}
            </select>
          </label>
          <div className="tabs small">
            <button aria-selected={mode === 'heat'} onClick={() => setMode('heat')}>Heat</button>
            <button aria-selected={mode === 'dots'} onClick={() => setMode('dots')}>Dots</button>
          </div>
        </div>
      </div>
      {error && <p className="error">Could not reach the API: {error}</p>}
      {pages && pages.length === 0 && <p className="empty">No pages tracked yet. Visit the demo page and click around.</p>}
      {data && data.total === 0 && <p className="empty">This page has no clicks yet.</p>}
      {data && data.total > 0 && <p className="meta">{data.total} clicks plotted. Page is scaled to {WIDTH}px wide.</p>}
      <div className="canvas-wrap"><canvas ref={canvas} /></div>
    </section>
  );
}
