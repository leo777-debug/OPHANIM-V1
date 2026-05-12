// lib/security.js
const rateLimitStore = new Map();

function getRateLimitKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress || 'unknown';
  return ip;
}

function checkRateLimit(key, maxRequests = 30, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) { record.count = 0; record.resetAt = now + windowMs; }
  record.count += 1;
  rateLimitStore.set(key, record);
  return { allowed: record.count <= maxRequests, remaining: Math.max(0, maxRequests - record.count), resetAt: record.resetAt, count: record.count };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt + 60000) rateLimitStore.delete(key);
  }
}, 300000);

const BOT_USER_AGENTS = ['curl','wget','python-requests','java/','go-http','scrapy','httpclient','libwww','lwp-','mechanize','nikto','sqlmap','masscan','zgrab','nmap'];

function detectBot(req) {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  if (!ua || ua.length < 10) return { isBot: true, reason: 'Missing user-agent' };
  for (const sig of BOT_USER_AGENTS) { if (ua.includes(sig)) return { isBot: true, reason: `Bot detected: ${sig}` }; }
  if (!req.headers['accept']) return { isBot: true, reason: 'Missing Accept header' };
  return { isBot: false };
}

const DANGEROUS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /SELECT\s+.*\s+FROM/gi,
  /INSERT\s+INTO/gi,
  /DROP\s+TABLE/gi,
  /UNION\s+SELECT/gi,
  /exec\s*\(/gi,
  /\$\{.*\}/gi,
  /\.\.\//g,
  /\/etc\/passwd/gi,
];

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/\0/g, '').trim().slice(0, 500);
}

function validateInput(value, type = 'string') {
  if (value === undefined || value === null) return { valid: true, value };
  switch (type) {
    case 'string': {
      const str = sanitizeString(String(value));
      for (const pattern of DANGEROUS_PATTERNS) { pattern.lastIndex = 0; if (pattern.test(str)) return { valid: false, reason: 'Dangerous pattern detected' }; }
      return { valid: true, value: str };
    }
    case 'number': { const num = Number(value); if (isNaN(num)) return { valid: false, reason: 'Expected number' }; return { valid: true, value: num }; }
    case 'lat': { const lat = Number(value); if (isNaN(lat) || lat < -90 || lat > 90) return { valid: false, reason: 'Invalid latitude' }; return { valid: true, value: lat }; }
    case 'lng': { const lng = Number(value); if (isNaN(lng) || lng < -180 || lng > 180) return { valid: false, reason: 'Invalid longitude' }; return { valid: true, value: lng }; }
    case 'date': { const d = new Date(value); if (isNaN(d.getTime())) return { valid: false, reason: 'Invalid date' }; return { valid: true, value: d.toISOString().split('T')[0] }; }
    default: return { valid: true, value };
  }
}

function sanitizeQuery(query) {
  const clean = {};
  for (const [key, value] of Object.entries(query || {})) {
    const cleanKey = sanitizeString(String(key));
    const result = validateInput(value, 'string');
    if (result.valid) clean[cleanKey] = result.value;
  }
  return clean;
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return {};
  const clean = {};
  for (const [key, value] of Object.entries(body)) {
    const cleanKey = sanitizeString(String(key));
    if (typeof value === 'string') { const r = validateInput(value, 'string'); if (r.valid) clean[cleanKey] = r.value; }
    else if (typeof value === 'number') clean[cleanKey] = value;
    else if (typeof value === 'boolean') clean[cleanKey] = value;
    else if (Array.isArray(value)) clean[cleanKey] = value.slice(0, 100);
  }
  return clean;
}

export async function fetchWithBackoff(url, options = {}, retries = 3, baseDelay = 500) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const resp = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      if (resp.status === 429 || resp.status >= 500) {
        if (attempt < retries - 1) { await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt) + Math.random() * 200)); continue; }
      }
      return resp;
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt) + Math.random() * 200));
    }
  }
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeade
