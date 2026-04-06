/**
 * Website Builder — Cloudflare Worker API
 * Bindings required in wrangler.toml:
 *   DB       = D1 database  (website-builder-db)
 *   CACHE    = KV namespace (WEBSITE_BUILDER_CACHE)
 *   ASSETS   = R2 bucket   (website-builder-assets)
 */

import { Router } from './router';
import { projectRoutes } from './routes/projects';
import { pageRoutes } from './routes/pages';
import { assetRoutes } from './routes/assets';
import { publishRoutes } from './routes/publish';
import { templateRoutes } from './routes/templates';
import { renderPage } from './renderer';
import { cors, jsonResponse, errorResponse } from './utils';

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  ASSETS: R2Bucket;
  ENVIRONMENT: string;
}

const router = new Router();

// ── Health check ────────────────────────────────────────────
router.get('/api/health', () =>
  jsonResponse({ status: 'ok', version: '1.0.0', ts: Date.now() })
);

// ── Mounted route groups ─────────────────────────────────────
router.mount('/api/projects', projectRoutes);
router.mount('/api/pages',    pageRoutes);
router.mount('/api/assets',   assetRoutes);
router.mount('/api/publish',  publishRoutes);
router.mount('/api/templates',templateRoutes);

// ── Serve published sites via custom domain / slug ───────────
router.get('/sites/:slug', async (req, env: Env, params) => {
  const { slug } = params;
  const cacheKey  = `site:${slug}:index`;
  const cached    = await env.CACHE.get(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: { 'content-type': 'text/html; charset=utf-8', 'x-cache': 'HIT' },
    });
  }

  const project = await env.DB.prepare(
    'SELECT id FROM projects WHERE slug = ? AND published_at IS NOT NULL'
  ).bind(slug).first<{ id: string }>();

  if (!project) return errorResponse('Site not found', 404);

  const homepage = await env.DB.prepare(
    'SELECT page_data FROM pages WHERE project_id = ? AND is_home = 1'
  ).bind(project.id).first<{ page_data: string }>();

  if (!homepage) return errorResponse('No homepage found', 404);

  const html = renderPage(JSON.parse(homepage.page_data));
  await env.CACHE.put(cacheKey, html, { expirationTtl: 3600 });

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'x-cache': 'MISS' },
  });
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }

    try {
      const response = await router.handle(request, env);
      // Attach CORS to every response
      const corsHeaders = cors();
      Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
      return response;
    } catch (err: any) {
      console.error(err);
      return errorResponse(err?.message ?? 'Internal server error', 500);
    }
  },
};
