'use client';
import { useEffect, useState } from 'react';
import { get } from '../lib/api';

const fmt = (d) => new Date(d).toLocaleString();
const path = (u) => { try { const x = new URL(u); return x.pathname + x.search; } catch (e) { return u; } };

export default function Sessions() {
  const [sessions, setSessions] = useState(null);
  const [selected, setSelected] = useState(null);
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    get('/api/sessions').then(setSessions).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const open = (id) => {
    setSelected(id);
    setEvents(null);
    get(`/api/sessions/${encodeURIComponent(id)}/events`).then(setEvents).catch((e) => setError(e.message));
  };

  const t0 = events && events.length ? new Date(events[0].timestamp).getTime() : 0;

  return (
    <div className="split">
      <section className="panel">
        <div className="panel-head">
          <h2>Sessions</h2>
          <button className="ghost" onClick={load}>Refresh</button>
        </div>
        {error && <p className="error">Could not reach the API: {error}. Check that the backend is running.</p>}
        {sessions && sessions.length === 0 && (
          <p className="empty">No sessions yet. Open the demo page at /demo/index.html and click around.</p>
        )}
        {sessions && sessions.length > 0 && (
          <table>
            <thead><tr><th>Session</th><th>Events</th><th>Views</th><th>Clicks</th><th>Last active</th></tr></thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.session_id} className={s.session_id === selected ? 'active' : ''}>
                  <td>
                    <button className="link" onClick={() => open(s.session_id)}>{s.session_id.slice(0, 8)}</button>
                  </td>
                  <td>{s.total_events}</td><td>{s.page_views}</td><td>{s.clicks}</td><td>{fmt(s.last_seen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!sessions && !error && <p className="empty">Loading sessions...</p>}
      </section>

      <section className="panel">
        <h2>User journey</h2>
        {!selected && <p className="empty">Select a session to see its events in order.</p>}
        {selected && !events && <p className="empty">Loading events...</p>}
        {events && (
          <ol className="journey">
            {events.map((e) => (
              <li key={e._id} className={e.type}>
                <span className="badge">{e.type === 'click' ? 'Click' : 'Page view'}</span>
                <span className="where">{path(e.url)}</span>
                <span className="meta">
                  {e.type === 'click' && `at (${e.x}, ${e.y}) `}
                  +{((new Date(e.timestamp).getTime() - t0) / 1000).toFixed(1)}s
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
