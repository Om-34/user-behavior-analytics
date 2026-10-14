/*!
 * Lightweight event tracker: page_view + click.
 * Usage: <script src="http://localhost:5000/tracker.js"></script>
 * Optional: add data-api="https://your-api-host" to point at a different backend.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var api = (script && script.getAttribute('data-api')) ||
            (script && script.src ? new URL(script.src).origin : location.origin);
  var ENDPOINT = api.replace(/\/$/, '') + '/api/events';
  var KEY = 'tracker_session';
  var TTL = 30 * 60 * 1000; // a session ends after 30 min of inactivity

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 3) | 8).toString(16);
    });
  }

  function readCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  // session_id lives in localStorage, mirrored to a cookie as a fallback.
  function sessionId() {
    var now = Date.now(), s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!s) { try { s = JSON.parse(readCookie(KEY)); } catch (e) {} }
    if (!s || !s.id || now - s.last > TTL) s = { id: uuid() };
    s.last = now;
    var str = JSON.stringify(s);
    try { localStorage.setItem(KEY, str); } catch (e) {}
    document.cookie = KEY + '=' + encodeURIComponent(str) + '; path=/; max-age=1800; SameSite=Lax';
    return s.id;
  }

  function send(payload) {
    var body = JSON.stringify(payload);
    // text/plain keeps this a "simple" CORS request (no preflight), so beacons work cross-origin.
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' }))) return;
    } catch (e) {}
    try {
      fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: body, keepalive: true });
    } catch (e) {}
  }

  function track(type, extra) {
    var ev = {
      session_id: sessionId(),
      type: type,
      url: location.href,
      timestamp: new Date().toISOString()
    };
    for (var k in extra) ev[k] = extra[k];
    send(ev);
  }

  function pageSize() {
    var d = document.documentElement, b = document.body;
    return {
      page_w: Math.max(d.scrollWidth, b ? b.scrollWidth : 0),
      page_h: Math.max(d.scrollHeight, b ? b.scrollHeight : 0)
    };
  }

  // click: x/y are document coordinates (pageX/pageY), so scrolling doesn't skew the heatmap.
  document.addEventListener('click', function (e) {
    var size = pageSize();
    track('click', {
      x: Math.round(e.pageX),
      y: Math.round(e.pageY),
      page_w: size.page_w,
      page_h: size.page_h,
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight
    });
  }, true);

  // page_view: on load, and on client-side navigation (SPAs).
  function pageView() { track('page_view', {}); }
  pageView();
  ['pushState', 'replaceState'].forEach(function (fn) {
    var orig = history[fn];
    history[fn] = function () { var r = orig.apply(this, arguments); pageView(); return r; };
  });
  window.addEventListener('popstate', pageView);
})();
