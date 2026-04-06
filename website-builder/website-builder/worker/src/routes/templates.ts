import { Router } from '../router';
import { jsonResponse, errorResponse, uid, now, parseBody } from '../utils';
import type { Env } from '../index';

export const templateRoutes = new Router();

templateRoutes.get('/', async (req, env: Env) => {
  const category = new URL(req.url).searchParams.get('category');
  const sql = category
    ? 'SELECT id, name, category, thumbnail, created_at FROM templates WHERE is_public = 1 AND category = ? ORDER BY created_at DESC'
    : 'SELECT id, name, category, thumbnail, created_at FROM templates WHERE is_public = 1 ORDER BY created_at DESC';
  const rows = category
    ? await env.DB.prepare(sql).bind(category).all()
    : await env.DB.prepare(sql).all();
  return jsonResponse(rows.results);
});

templateRoutes.get('/:id', async (req, env: Env, params) => {
  const tpl = await env.DB.prepare('SELECT * FROM templates WHERE id = ?').bind(params.id).first();
  if (!tpl) return errorResponse('Template not found', 404);
  return jsonResponse({ ...tpl, page_data: JSON.parse(tpl.page_data as string) });
});

templateRoutes.post('/', async (req, env: Env) => {
  const body = await parseBody<{ name: string; category: string; page_data: object; thumbnail?: string }>(req);
  if (!body.name || !body.category || !body.page_data) return errorResponse('name, category, page_data required');
  const id = uid();
  await env.DB.prepare(
    'INSERT INTO templates (id, name, category, thumbnail, page_data, is_public, created_at) VALUES (?,?,?,?,?,1,?)'
  ).bind(id, body.name, body.category, body.thumbnail ?? '', JSON.stringify(body.page_data), now()).run();
  return jsonResponse({ id }, 201);
});
