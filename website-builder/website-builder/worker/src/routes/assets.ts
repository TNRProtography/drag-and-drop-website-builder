import { Router } from '../router';
import { jsonResponse, errorResponse, uid, now } from '../utils';
import type { Env } from '../index';

export const assetRoutes = new Router();

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'image/avif', 'video/mp4', 'video/webm', 'application/pdf', 'font/woff2',
]);

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

/**
 * POST /api/assets/upload
 * Expects multipart/form-data with fields: file, project_id, user_id
 */
assetRoutes.post('/upload', async (req, env: Env) => {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return errorResponse('Expected multipart/form-data');
  }

  const file      = formData.get('file') as File | null;
  const projectId = formData.get('project_id') as string | null;
  const userId    = req.headers.get('x-user-id') || (formData.get('user_id') as string | null);

  if (!file)      return errorResponse('file required');
  if (!projectId) return errorResponse('project_id required');
  if (!userId)    return errorResponse('user_id required');

  // Validate
  if (!ALLOWED_TYPES.has(file.type)) {
    return errorResponse(`File type ${file.type} not allowed`);
  }
  if (file.size > MAX_SIZE) {
    return errorResponse(`File too large (max ${MAX_SIZE / 1024 / 1024}MB)`);
  }

  const id  = uid();
  const ext = file.name.split('.').pop() ?? 'bin';
  const r2Key = `${projectId}/${id}.${ext}`;

  // Write to R2
  const arrayBuffer = await file.arrayBuffer();
  await env.ASSETS.put(r2Key, arrayBuffer, {
    httpMetadata: { contentType: file.type },
    customMetadata: { projectId, userId, originalName: file.name },
  });

  // Public URL pattern — adjust to your R2 public domain or worker proxy
  const url = `/api/assets/file/${r2Key}`;

  // Persist metadata to D1
  await env.DB.prepare(
    `INSERT INTO assets (id, project_id, user_id, name, r2_key, url, mime_type, size, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, projectId, userId, file.name, r2Key, url, file.type, file.size, now()).run();

  return jsonResponse({ id, url, name: file.name, mime_type: file.type, size: file.size }, 201);
});

/**
 * GET /api/assets/file/:projectId/:filename
 * Proxy reads from R2 and streams back (with cache headers).
 */
assetRoutes.get('/file/:projectId/:filename', async (req, env: Env, params) => {
  const r2Key = `${params.projectId}/${params.filename}`;
  const object = await env.ASSETS.get(r2Key);

  if (!object) return errorResponse('Asset not found', 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
});

/**
 * GET /api/assets/project/:projectId
 * List all assets for a project.
 */
assetRoutes.get('/project/:projectId', async (req, env: Env, params) => {
  const assets = await env.DB.prepare(
    'SELECT id, name, url, mime_type, size, width, height, created_at FROM assets WHERE project_id = ? ORDER BY created_at DESC'
  ).bind(params.projectId).all();
  return jsonResponse(assets.results);
});

/**
 * DELETE /api/assets/:id
 * Removes from R2 and D1.
 */
assetRoutes.delete('/:id', async (req, env: Env, params) => {
  const asset = await env.DB.prepare(
    'SELECT r2_key FROM assets WHERE id = ?'
  ).bind(params.id).first<{ r2_key: string }>();

  if (!asset) return errorResponse('Asset not found', 404);

  await Promise.all([
    env.ASSETS.delete(asset.r2_key),
    env.DB.prepare('DELETE FROM assets WHERE id = ?').bind(params.id).run(),
  ]);

  return jsonResponse({ ok: true });
});
