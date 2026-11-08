const https = require('node:https');
const http = require('node:http');
const { URL } = require('node:url');
const { validateEvent } = require('./model.cjs');

// Minimalistic native ICS (iCalendar RFC 5545) formatter and parser
function escapeIcsText(str = '') {
  return String(str).replace(/[\\;,]/g, match => '\\' + match).replace(/\r?\n/g, '\\n');
}

function unescapeIcsText(str = '') {
  return String(str).replace(/\\([\\;,])/g, '$1').replace(/\\n/gi, '\n');
}

function toIcsDate(isoString, allDay = false) {
  const d = new Date(isoString);
  if (allDay) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `;VALUE=DATE:${y}${m}${day}`;
  }
  return `:${d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`;
}

function parseIcsDate(value, params = '') {
  if (params.includes('VALUE=DATE') || /^\d{8}$/.test(value.trim())) {
    const match = value.trim().match(/^(\d{4})(\d{2})(\d{2})/);
    if (!match) throw new Error('Ungültiges ICS-Datum.');
    return {
      iso: new Date(Date.UTC(+match[1], +match[2] - 1, +match[3])).toISOString(),
      allDay: true
    };
  }
  const match = value.trim().match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)/);
  if (!match) throw new Error('Ungültiges ICS-Zeitformat.');
  if (match[7] === 'Z') {
    return {
      iso: new Date(Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6])).toISOString(),
      allDay: false
    };
  }
  return {
    iso: new Date(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6]).toISOString(),
    allDay: false
  };
}

function eventToIcs(event) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SimHub//SimHub Calendar 2.0//DE',
    'BEGIN:VEVENT',
    `UID:${event.id}`,
    `DTSTAMP${toIcsDate(new Date().toISOString())}`,
    `SUMMARY:${escapeIcsText(event.title)}`
  ];
  if (event.allDay) {
    lines.push(`DTSTART${toIcsDate(event.start, true)}`);
    lines.push(`DTEND${toIcsDate(event.end, true)}`);
  } else {
    lines.push(`DTSTART${toIcsDate(event.start, false)}`);
    lines.push(`DTEND${toIcsDate(event.end, false)}`);
  }
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  if (event.notes) lines.push(`DESCRIPTION:${escapeIcsText(event.notes)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR', '');
  return lines.join('\r\n');
}

function icsToEvents(icsContent, calendarId = '1', defaultCalendars) {
  // Unfold lines (RFC 5545 section 3.1)
  const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);
  const events = [];
  let inVEvent = false;
  let current = {};

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inVEvent = true;
      current = { calendarId };
      continue;
    }
    if (line === 'END:VEVENT') {
      inVEvent = false;
      if (current.id && current.start && current.end) {
        try {
          events.push(validateEvent(current, defaultCalendars));
        } catch {
          // Skip unparseable external events gracefully
        }
      }
      current = {};
      continue;
    }
    if (!inVEvent) continue;

    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const rawKey = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const [name, ...paramParts] = rawKey.split(';');
    const params = paramParts.join(';');

    switch (name.toUpperCase()) {
      case 'UID':
        current.id = value.trim().replace(/[^\w-]/g, '_');
        break;
      case 'SUMMARY':
        current.title = unescapeIcsText(value);
        break;
      case 'DTSTART': {
        const parsed = parseIcsDate(value, params);
        current.start = parsed.iso;
        if (parsed.allDay) current.allDay = true;
        break;
      }
      case 'DTEND': {
        const parsed = parseIcsDate(value, params);
        current.end = parsed.iso;
        break;
      }
      case 'LOCATION':
        current.location = unescapeIcsText(value);
        break;
      case 'DESCRIPTION':
        current.notes = unescapeIcsText(value);
        break;
    }
  }
  return events;
}

// Light native HTTP request runner with Basic Auth & timeouts
function request(method, targetUrl, { auth, headers = {}, body = '', timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    if (!['https:', 'http:'].includes(url.protocol)) {
      return reject(new Error('Nur HTTPS und lokales HTTP werden unterstützt.'));
    }
    const transport = url.protocol === 'https:' ? https : http;
    const reqHeaders = { ...headers };
    if (auth && auth.user && auth.password) {
      reqHeaders['Authorization'] = 'Basic ' + Buffer.from(`${auth.user}:${auth.password}`).toString('base64');
    }
    if (body) {
      reqHeaders['Content-Length'] = Buffer.byteLength(body);
    }

    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      headers: reqHeaders,
      timeout: timeoutMs
    };

    const req = transport.request(options, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => {
        data += chunk;
        if (Buffer.byteLength(data) > 20 * 1024 * 1024) {
          req.destroy();
          reject(new Error('Serverantwort überschreitet 20 MB.'));
        }
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Zeitüberschreitung bei der Serveranfrage.'));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// CalDAV Client Class
class CalDavClient {
  constructor({ url, user, password }) {
    if (!url) throw new Error('Server-URL fehlt.');
    this.url = url.endsWith('/') ? url : url + '/';
    this.auth = { user, password };
  }

  async testConnection() {
    // PROPFIND on the calendar home URL to check authentication & capabilities
    const body = `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:displayname />
    <D:resourcetype />
  </D:prop>
</D:propfind>`;
    const res = await request('PROPFIND', this.url, {
      auth: this.auth,
      headers: { 'Depth': '0', 'Content-Type': 'application/xml; charset=utf-8' },
      body
    });
    if (res.statusCode === 401 || res.statusCode === 403) throw new Error('Authentifizierung fehlgeschlagen (Benutzer oder Passwort falsch).');
    if (res.statusCode < 200 || res.statusCode >= 300) throw new Error(`Server antwortete mit Statuscode ${res.statusCode}.`);
    return { ok: true, status: res.statusCode };
  }

  async fetchEvents(calendarId, defaultCalendars) {
    // Fetch all VEVENTs using a CalDAV REPORT query
    const body = `<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag />
    <C:calendar-data />
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT" />
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;
    const res = await request('REPORT', this.url, {
      auth: this.auth,
      headers: { 'Depth': '1', 'Content-Type': 'application/xml; charset=utf-8' },
      body
    });
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(`Kalenderabruf fehlgeschlagen (${res.statusCode}).`);
    }

    // Extract calendar-data XML blocks
    const events = [];
    const calendarDataRegex = /<(?:\w+:)?calendar-data[^>]*>([\s\S]*?)<\/(?:\w+:)?calendar-data>/gi;
    let match;
    while ((match = calendarDataRegex.exec(res.body)) !== null) {
      const ics = match[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      events.push(...icsToEvents(ics, calendarId, defaultCalendars));
    }
    return events;
  }

  async putEvent(event) {
    const eventUrl = `${this.url}${encodeURIComponent(event.id)}.ics`;
    const ics = eventToIcs(event);
    const res = await request('PUT', eventUrl, {
      auth: this.auth,
      headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
      body: ics
    });
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(`Termin konnte nicht auf den Server hochgeladen werden (${res.statusCode}).`);
    }
    return true;
  }

  async deleteEvent(eventId) {
    const eventUrl = `${this.url}${encodeURIComponent(eventId)}.ics`;
    const res = await request('DELETE', eventUrl, { auth: this.auth });
    if (res.statusCode === 404) return true;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(`Termin konnte auf dem Server nicht gelöscht werden (${res.statusCode}).`);
    }
    return true;
  }
}

module.exports = {
  escapeIcsText,
  unescapeIcsText,
  eventToIcs,
  icsToEvents,
  request,
  CalDavClient
};
