type Handler = (req: Request, env: any, params: Record<string, string>) => Promise<Response> | Response;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

export class Router {
  private routes: Route[] = [];

  private add(method: string, path: string, handler: Handler) {
    const keys: string[] = [];
    const pattern = new RegExp(
      '^' + path.replace(/:([^/]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$'
    );
    this.routes.push({ method, pattern, keys, handler });
  }

  get(path: string, h: Handler)    { this.add('GET',    path, h); }
  post(path: string, h: Handler)   { this.add('POST',   path, h); }
  put(path: string, h: Handler)    { this.add('PUT',    path, h); }
  patch(path: string, h: Handler)  { this.add('PATCH',  path, h); }
  delete(path: string, h: Handler) { this.add('DELETE', path, h); }

  mount(prefix: string, subrouter: Router) {
    for (const route of subrouter.routes) {
      // re-build the regex with prefix prepended
      const prefixedSource = route.pattern.source.replace('^', '^' + escapeRegex(prefix));
      this.routes.push({ ...route, pattern: new RegExp(prefixedSource) });
    }
  }

  async handle(request: Request, env: any): Promise<Response> {
    const url    = new URL(request.url);
    const method = request.method.toUpperCase();

    for (const route of this.routes) {
      if (route.method !== method && route.method !== 'ALL') continue;
      const m = url.pathname.match(route.pattern);
      if (!m) continue;
      const params: Record<string, string> = {};
      route.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return route.handler(request, env, params);
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
