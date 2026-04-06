import { Router } from '../router';
import { jsonResponse, errorResponse, uid, now, slugify, parseBody } from '../utils';
import type { Env } from '../index';

export const projectRoutes = new Router();

// ── List projects for a user ─────────────────────────────────
projectRoutes.get('/', async (req, env: Env) => {
  const userId = new URL(req.url).searchParams.get('user_id') || req.headers.get('x-user-id');
  if (!userId) return errorResponse('user_id required');

  const rows = await env.DB.prepare(
    `SELECT id, name, slug, description, thumbnail, published_at, published_url, settings, created_at, updated_at
     FROM projects WHERE user_id = ? ORDER BY updated_at DESC`
  ).bind(userId).all();

  return jsonResponse(rows.results);
});

// ── Create project ───────────────────────────────────────────
projectRoutes.post('/', async (req, env: Env) => {
  const userId = req.headers.get('x-user-id');
  if (!userId) return errorResponse('x-user-id header required');

  const body = await parseBody<{ name: string; description?: string }>(req);
  if (!body.name) return errorResponse('name required');

  const id   = uid();
  const slug = slugify(body.name) + '-' + id.slice(0, 6);
  const ts   = now();

  await env.DB.prepare(
    `INSERT INTO projects (id, user_id, name, slug, description, settings, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, userId, body.name, slug, body.description ?? '', '{}', ts, ts).run();

  // Auto-create a homepage
  const pageId = uid();
  const defaultPage = JSON.stringify({
    id: pageId,
    meta: { title: body.name, description: '' },
    breakpoints: { desktop: 1440, tablet: 768, mobile: 375 },
    nodes: [{
      id: 'root',
      type: 'container',
      props: {},
      styles: { desktop: { minHeight: '100vh', display: 'flex', flexDirection: 'column' } },
      children: []
    }]
  });

  await env.DB.prepare(
    `INSERT INTO pages (id, project_id, name, path, title, is_home, sort_order, page_data, created_at, updated_at)
     VALUES (?, ?, 'Home', '/', ?, 1, 0, ?, ?, ?)`
  ).bind(pageId, id, body.name, defaultPage, ts, ts).run();

  return jsonResponse({ id, slug, name: body.name, pages: [{ id: pageId, name: 'Home', path: '/' }] }, 201);
});

// ── Get project ──────────────────────────────────────────────
projectRoutes.get('/:id', async (req, env: Env, params) => {
  const project = await env.DB.prepare(
    'SELECT * FROM projects WHERE id = ?'
  ).bind(params.id).first();
  if (!project) return errorResponse('Project not found', 404);

  const pages = await env.DB.prepare(
    'SELECT id, name, path, title, description, is_home, sort_order FROM pages WHERE project_id = ? ORDER BY sort_order'
  ).bind(params.id).all();

  return jsonResponse({ ...project, pages: pages.results });
});

// ── Update project ───────────────────────────────────────────
projectRoutes.patch('/:id', async (req, env: Env, params) => {
  const body = await parseBody<{ name?: string; description?: string; settings?: object; custom_domain?: string }>(req);
  const sets: string[] = [];
  const vals: unknown[] = [];

  if (body.name)          { sets.push('name = ?');          vals.push(body.name); }
  if (body.description !== undefined) { sets.push('description = ?'); vals.push(body.description); }
  if (body.settings)      { sets.push('settings = ?');      vals.push(JSON.stringify(body.settings)); }
  if (body.custom_domain !== undefined) { sets.push('custom_domain = ?'); vals.push(body.custom_domain); }

  if (!sets.length) return errorResponse('Nothing to update');

  sets.push('updated_at = ?');
  vals.push(now(), params.id);

  await env.DB.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...vals).run();

  return jsonResponse({ ok: true });
});

// ── Delete project ───────────────────────────────────────────
projectRoutes.delete('/:id', async (req, env: Env, params) => {
  await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(params.id).run();
  return jsonResponse({ ok: true });
});
