// Tiny router built on Node's http module (so we don't need Express).
// Supports paths like /api/books/:id and turns thrown AppErrors into JSON responses.
const { AppError } = require('./errors');

// Handlers return plain data (sent as 200) or an HttpResult for other codes.
class HttpResult {
  constructor(status, data) { this.status = status; this.data = data; }
}

class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pattern, handler) {
    const keys = [];
    const regex = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    this.routes.push({ method, regex, keys, handler });
  }

  get(p, h) { this.add('GET', p, h); }
  post(p, h) { this.add('POST', p, h); }
  put(p, h) { this.add('PUT', p, h); }
  delete(p, h) { this.add('DELETE', p, h); }

  match(method, pathname) {
    let pathMatched = false;
    for (const route of this.routes) {
      const m = pathname.match(route.regex);
      if (!m) continue;
      pathMatched = true;
      if (route.method !== method) continue;
      const params = {};
      route.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { route, params };
    }
    return { route: null, pathMatched };
  }

  async handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const { route, params, pathMatched } = this.match(req.method, url.pathname);

    if (!route) {
      return sendJson(res, pathMatched ? 405 : 404, { error: pathMatched ? 'Method not allowed' : 'Route not found' });
    }

    try {
      const body = ['POST', 'PUT'].includes(req.method) ? await readJson(req) : {};
      const query = Object.fromEntries(url.searchParams);
      const result = await route.handler({ params, query, body });
      const isWrapped = result instanceof HttpResult;
      const status = isWrapped ? result.status : 200;
      if (status === 204) { res.writeHead(204); return res.end(); }
      sendJson(res, status, isWrapped ? result.data : result);
    } catch (err) {
      if (err instanceof AppError) return sendJson(res, err.status, { error: err.message });
      console.error(err);
      sendJson(res, 500, { error: 'Internal server error' });
    }
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch { reject(new AppError('Request body must be valid JSON', 400)); }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

module.exports = { Router, HttpResult, sendJson };
