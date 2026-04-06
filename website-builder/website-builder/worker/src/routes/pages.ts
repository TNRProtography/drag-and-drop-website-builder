import { Router } from '../router';
import { jsonResponse, errorResponse, uid, now, parseBody } from '../utils';
import type { Env } from '../index';

export const pageRoutes = new Router();

// ── List pages in project ────────────────────────────────────
pageRoutes.get('/project/:projectId', async (req, env: Env, params) => {
  const pages = await env.DB.prepare(
    'SELECT id, name, path, title, description, og_image, is_home, sort_order, updated_at FROM pages WHERE project_id = ? ORDER BY sort_order'
  ).bind(params.projectId).all();
  return jsonResponse(pages.results);
});

// ── Get single page (full data) ──────────────────────────────
pageRoutes.get('/:id', async (req, env: Env, params) => {
  const page = await env.DB.prepare('SELECT * FROM pages WHERE id = ?').bind(params.id).first();
  if (!page) return errorResponse('Page not found', 404);
  return jsonResponse({ ...page, page_data: JSON.parse(page.page_data as string) });
});

// ── Create page ──────────────────────────────────────────────
pageRoutes.post('/', async (req, env: Env) => {
  const body = await parseBody<{ project_id: string; name: string; path: string; title?: string }>(req);
  if (!body.project_id || !body.name || !body.path) return errorResponse('project_id, name, path required');

  const id = uid();
  const ts = now();
  const defaultData = JSON.stringify({
    id,
    meta: { title: body.title ?? body.name, description: '' },
    breakpoints: { desktop: 1440, tablet: 768, mobile: 375 },
    nodes: [{ id: 'root', type: 'container', props: {}, styles: { desktop: { minHeight: '100vh' } }, children: [] }]
  });

  await env.DB.prepare(
    'INSERT INTO pages (id, project_id, name, path, title, is_home, sort_order, page_data, created_at, updated_at) VALUES (?,?,?,?,?,0,0,?,?,?)'
  ).bind(id, body.project_id, body.name, body.path, body.title ?? body.name, defaultData, ts, ts).run();

  return jsonResponse({ id, name: body.name, path: body.path }, 201);
});

// ── Save page data (auto-versions every N saves) ─────────────
pageRoutes.put('/:id', async (req, env: Env, params) => {
  const body = await parseBody<{ page_data: object; create_version?: boolean }>(req);
  if (!body.page_data) return errorResponse('page_data required');

  const ts = now();
  const serialised = JSON.stringify(body.page_data);

  await env.DB.prepare('UPDATE pages SET page_data = ?, updated_at = ? WHERE id = ?')
    .bind(serialised, ts, params.id).run();

  // Optionally snapshot a version
  if (body.create_version) {
    const last = await env.DB.prepare(
      'SELECT MAX(version_number) as v FROM page_versions WHERE page_id = ?'
    ).bind(params.id).first<{ v: number | null }>();

    const nextVersion = (last?.v ?? 0) + 1;
    await env.DB.prepare(
      'INSERT INTO page_versions (id, page_id, version_number, page_data, created_at) VALUES (?,?,?,?,?)'
    ).bind(uid(), params.id, nextVersion, serialised, ts).run();
  }

  return jsonResponse({ ok: true, updated_at: ts });
});

// ── List versions ────────────────────────────────────────────
pageRoutes.get('/:id/versions', async (req, env: Env, params) => {
  const versions = await env.DB.prepare(
    'SELECT id, version_number, created_at FROM page_versions WHERE page_id = ? ORDER BY version_number DESC LIMIT 20'
  ).bind(params.id).all();
  return jsonResponse(versions.results);
});

// ── Restore version ──────────────────────────────────────────
pageRoutes.post('/:id/restore/:versionId', async (req, env: Env, params) => {
  const version = await env.DB.prepare(
    'SELECT page_data FROM page_versions WHERE id = ? AND page_id = ?'
  ).bind(params.versionId, params.id).first<{ page_data: string }>();

  if (!version) return errorResponse('Version not found', 404);

  await env.DB.prepare('UPDATE pages SET page_data = ?, updated_at = ? WHERE id = ?')
    .bind(version.page_data, now(), params.id).run();

  return jsonResponse({ ok: true });
});

// ── Delete page ──────────────────────────────────────────────
pageRoutes.delete('/:id', async (req, env: Env, params) => {
  await env.DB.prepare('DELETE FROM pages WHERE id = ?').bind(params.id).run();
  return jsonResponse({ ok: true });
});
