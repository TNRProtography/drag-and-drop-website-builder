import { Router } from '../router';
import { jsonResponse, errorResponse, now } from '../utils';
import { renderPage } from '../renderer';
import type { Env } from '../index';

export const publishRoutes = new Router();

/**
 * POST /api/publish/:projectId
 * Renders every page in the project, stores HTML in KV, marks project as published.
 */
publishRoutes.post('/:projectId', async (req, env: Env, params) => {
  const { projectId } = params;

  // 1. Load project
  const project = await env.DB.prepare(
    'SELECT id, slug, name FROM projects WHERE id = ?'
  ).bind(projectId).first<{ id: string; slug: string; name: string }>();

  if (!project) return errorResponse('Project not found', 404);

  // 2. Load all pages
  const pages = await env.DB.prepare(
    'SELECT id, name, path, page_data FROM pages WHERE project_id = ? ORDER BY sort_order'
  ).bind(projectId).all<{ id: string; name: string; path: string; page_data: string }>();

  if (!pages.results.length) return errorResponse('No pages to publish');

  const publishedTs = now();
  const baseUrl = `https://website-builder.workers.dev/sites/${project.slug}`;
  const kvWrites: Promise<void>[] = [];

  for (const page of pages.results) {
    let doc: object;
    try {
      doc = JSON.parse(page.page_data);
    } catch {
      return errorResponse(`Invalid page_data for page ${page.id}`);
    }

    const html = renderPage(doc as any);

    // Store rendered HTML in KV with 1-week TTL
    // Key format: site:{slug}:{path}
    const safePath = page.path === '/' ? 'index' : page.path.replace(/^\//, '').replace(/\//g, ':');
    const kvKey = `site:${project.slug}:${safePath}`;
    kvWrites.push(
      env.CACHE.put(kvKey, html, { expirationTtl: 60 * 60 * 24 * 7 })
    );
  }

  // 3. Write all pages to KV in parallel
  await Promise.all(kvWrites);

  // 4. Mark project as published
  await env.DB.prepare(
    'UPDATE projects SET published_at = ?, published_url = ?, updated_at = ? WHERE id = ?'
  ).bind(publishedTs, baseUrl, publishedTs, projectId).run();

  return jsonResponse({
    ok: true,
    published_at: publishedTs,
    url: baseUrl,
    pages_published: pages.results.length,
  });
});

/**
 * DELETE /api/publish/:projectId
 * Unpublishes — removes from KV and clears published_at.
 */
publishRoutes.delete('/:projectId', async (req, env: Env, params) => {
  const project = await env.DB.prepare(
    'SELECT slug FROM projects WHERE id = ?'
  ).bind(params.projectId).first<{ slug: string }>();

  if (!project) return errorResponse('Project not found', 404);

  // List and delete all KV keys for this site
  const list = await env.CACHE.list({ prefix: `site:${project.slug}:` });
  await Promise.all(list.keys.map(k => env.CACHE.delete(k.name)));

  await env.DB.prepare(
    'UPDATE projects SET published_at = NULL, published_url = NULL WHERE id = ?'
  ).bind(params.projectId).run();

  return jsonResponse({ ok: true, removed: list.keys.length });
});

/**
 * GET /api/publish/:projectId/preview
 * Returns rendered HTML for the homepage (for live preview, not caching).
 */
publishRoutes.get('/:projectId/preview', async (req, env: Env, params) => {
  const homepage = await env.DB.prepare(
    `SELECT p.page_data FROM pages p
     JOIN projects pr ON pr.id = p.project_id
     WHERE pr.id = ? AND p.is_home = 1`
  ).bind(params.projectId).first<{ page_data: string }>();

  if (!homepage) return errorResponse('Homepage not found', 404);

  const doc = JSON.parse(homepage.page_data);
  const html = renderPage(doc);
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
});
