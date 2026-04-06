/**
 * Website Builder — Cloudflare Worker API (bundled, deployment-ready)
 * Deploy: wrangler deploy  (bindings already in wrangler.toml)
 */

// ── Utils ─────────────────────────────────────────────────────
function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
  };
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'content-type': 'application/json', ...cors() },
  });
}
function err(msg, status = 400) { return json({ error: msg }, status); }
const uid  = () => crypto.randomUUID();
const now  = () => Date.now();
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function body(req) {
  const t = await req.text();
  return t ? JSON.parse(t) : {};
}

// ── Renderer ──────────────────────────────────────────────────
function toKebab(s) { return s.replace(/([A-Z])/g, m => '-' + m.toLowerCase()); }
function styleStr(obj) { return Object.entries(obj).map(([k,v]) => `${toKebab(k)}:${v}`).join(';'); }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function collectCSS(nodes, bp) {
  const d=[], t=[], m=[];
  function walk(n) {
    if (n.hidden) return;
    if (n.styles?.desktop) d.push(`.n-${n.id}{${styleStr(n.styles.desktop)}}`);
    if (n.styles?.tablet)  t.push(`.n-${n.id}{${styleStr(n.styles.tablet)}}`);
    if (n.styles?.mobile)  m.push(`.n-${n.id}{${styleStr(n.styles.mobile)}}`);
    n.children?.forEach(walk);
  }
  nodes.forEach(walk);
  let css = d.join('');
  if (t.length) css += `@media(max-width:${bp.tablet}px){${t.join('')}}`;
  if (m.length) css += `@media(max-width:${bp.mobile}px){${m.join('')}}`;
  return css;
}

function renderNode(n) {
  if (n.hidden) return '';
  const cls = `n-${n.id}`;
  const children = n.children?.map(renderNode).join('') ?? '';
  const p = n.props ?? {};
  switch(n.type) {
    case 'text':      return `<p class="${cls}">${p.html || esc(p.text||'')}</p>`;
    case 'heading': {
      const l = Math.min(Math.max(Number(p.level||2),1),6);
      return `<h${l} class="${cls}">${p.html || esc(p.text||'Heading')}</h${l}>`;
    }
    case 'image':   return `<img class="${cls}" src="${esc(p.src||'')}" alt="${esc(p.alt||'')}" loading="lazy">`;
    case 'button':
      return p.href
        ? `<a href="${esc(p.href)}" class="${cls}"${p.newTab?' target="_blank" rel="noopener"':''}>${esc(p.label||'Button')}</a>`
        : `<button type="${p.btnType||'button'}" class="${cls}">${esc(p.label||'Button')}</button>`;
    case 'divider': return `<hr class="${cls}">`;
    case 'spacer':  return `<div class="${cls}" aria-hidden="true"></div>`;
    case 'input':   return `<input class="${cls}" type="${esc(p.type||'text')}" name="${esc(p.name||'')}" placeholder="${esc(p.placeholder||'')}"${p.required?' required':''}>`;
    case 'textarea':return `<textarea class="${cls}" name="${esc(p.name||'')}" rows="${p.rows||4}" placeholder="${esc(p.placeholder||'')}"></textarea>`;
    case 'html':    return `<div class="${cls}">${p.html||''}</div>`;
    case 'form':    return `<form class="${cls}" action="${esc(p.action||'#')}" method="${esc(p.method||'POST')}">${children}</form>`;
    default:        return `<div class="${cls}">${children}</div>`;
  }
}

const BASE_CSS = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1a1a1a}img,video{max-width:100%;display:block}a{color:inherit}button{cursor:pointer}`;

function renderPage(doc) {
  const bp   = doc.breakpoints ?? { desktop:1440, tablet:768, mobile:375 };
  const meta = doc.meta ?? { title:'Untitled' };
  const body = doc.nodes.map(renderNode).join('');
  const css  = collectCSS(doc.nodes, bp);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(meta.title)}</title>
${meta.description?`<meta name="description" content="${esc(meta.description)}">
<meta property="og:description" content="${esc(meta.description)}">`:''}<meta property="og:title" content="${esc(meta.title)}">
${meta.ogImage?`<meta property="og:image" content="${esc(meta.ogImage)}">`:''}<style>${BASE_CSS}${css}</style>
${meta.customHead||''}
</head>
<body>${body}</body>
</html>`;
}

// ── Router ────────────────────────────────────────────────────
class Router {
  constructor() { this.routes = []; }
  add(method, path, fn) {
    const keys = [];
    const re = new RegExp('^'+path.replace(/:([^/]+)/g,(_,k)=>{keys.push(k);return'([^/]+)'})+'$');
    this.routes.push({ method, re, keys, fn });
  }
  get(p,f)    { this.add('GET',p,f); }
  post(p,f)   { this.add('POST',p,f); }
  put(p,f)    { this.add('PUT',p,f); }
  patch(p,f)  { this.add('PATCH',p,f); }
  delete(p,f) { this.add('DELETE',p,f); }
  async handle(req, env) {
    const url = new URL(req.url), method = req.method.toUpperCase();
    for (const r of this.routes) {
      if (r.method !== method) continue;
      const m = url.pathname.match(r.re);
      if (!m) continue;
      const params = {};
      r.keys.forEach((k,i) => params[k] = decodeURIComponent(m[i+1]));
      return r.fn(req, env, params);
    }
    return err('Not found', 404);
  }
}

const router = new Router();

// ── Health ────────────────────────────────────────────────────
router.get('/api/health', () => json({ ok: true, version: '1.0.0', ts: Date.now() }));

// ── Projects ──────────────────────────────────────────────────
router.get('/api/projects', async (req, env) => {
  const userId = new URL(req.url).searchParams.get('user_id') || req.headers.get('x-user-id');
  if (!userId) return err('user_id required');
  const rows = await env.DB.prepare('SELECT id,name,slug,description,published_at,published_url,settings,created_at,updated_at FROM projects WHERE user_id=? ORDER BY updated_at DESC').bind(userId).all();
  return json(rows.results);
});

router.post('/api/projects', async (req, env) => {
  const userId = req.headers.get('x-user-id') || 'demo-user';
  const b = await body(req);
  if (!b.name) return err('name required');
  const id = uid(), s = slug(b.name)+'-'+id.slice(0,6), ts = now();
  await env.DB.prepare('INSERT INTO projects (id,user_id,name,slug,description,settings,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,userId,b.name,s,b.description||'','{}',ts,ts).run();
  const pageId = uid();
  const defaultData = JSON.stringify({ id:pageId, meta:{title:b.name}, breakpoints:{desktop:1440,tablet:768,mobile:375}, nodes:[{id:'root',type:'container',name:'Page root',props:{},styles:{desktop:{minHeight:'100vh',display:'flex',flexDirection:'column'}},children:[]}] });
  await env.DB.prepare('INSERT INTO pages (id,project_id,name,path,title,is_home,sort_order,page_data,created_at,updated_at) VALUES (?,?,?,?,?,1,0,?,?,?)').bind(pageId,id,'Home','/',b.name,defaultData,ts,ts).run();
  return json({ id, slug:s, name:b.name, pages:[{ id:pageId, name:'Home', path:'/' }] }, 201);
});

router.get('/api/projects/:id', async (req, env, p) => {
  const proj = await env.DB.prepare('SELECT * FROM projects WHERE id=?').bind(p.id).first();
  if (!proj) return err('Not found', 404);
  const pages = await env.DB.prepare('SELECT id,name,path,title,is_home,sort_order FROM pages WHERE project_id=? ORDER BY sort_order').bind(p.id).all();
  return json({ ...proj, pages: pages.results });
});

router.patch('/api/projects/:id', async (req, env, p) => {
  const b = await body(req);
  const sets=[], vals=[];
  if (b.name)        { sets.push('name=?');        vals.push(b.name); }
  if (b.description !== undefined) { sets.push('description=?'); vals.push(b.description); }
  if (b.settings)    { sets.push('settings=?');    vals.push(JSON.stringify(b.settings)); }
  if (b.custom_domain !== undefined) { sets.push('custom_domain=?'); vals.push(b.custom_domain); }
  if (!sets.length) return err('Nothing to update');
  sets.push('updated_at=?'); vals.push(now(), p.id);
  await env.DB.prepare(`UPDATE projects SET ${sets.join(',')} WHERE id=?`).bind(...vals).run();
  return json({ ok:true });
});

router.delete('/api/projects/:id', async (req, env, p) => {
  await env.DB.prepare('DELETE FROM projects WHERE id=?').bind(p.id).run();
  return json({ ok:true });
});

// ── Pages ─────────────────────────────────────────────────────
router.get('/api/pages/project/:projectId', async (req, env, p) => {
  const rows = await env.DB.prepare('SELECT id,name,path,title,description,is_home,sort_order,updated_at FROM pages WHERE project_id=? ORDER BY sort_order').bind(p.projectId).all();
  return json(rows.results);
});

router.get('/api/pages/:id', async (req, env, p) => {
  const page = await env.DB.prepare('SELECT * FROM pages WHERE id=?').bind(p.id).first();
  if (!page) return err('Not found', 404);
  return json({ ...page, page_data: JSON.parse(page.page_data) });
});

router.post('/api/pages', async (req, env) => {
  const b = await body(req);
  if (!b.project_id||!b.name||!b.path) return err('project_id, name, path required');
  const id=uid(), ts=now();
  const data = JSON.stringify({ id, meta:{title:b.title||b.name}, breakpoints:{desktop:1440,tablet:768,mobile:375}, nodes:[{id:'root',type:'container',props:{},styles:{desktop:{minHeight:'100vh'}},children:[]}] });
  await env.DB.prepare('INSERT INTO pages (id,project_id,name,path,title,is_home,sort_order,page_data,created_at,updated_at) VALUES (?,?,?,?,?,0,0,?,?,?)').bind(id,b.project_id,b.name,b.path,b.title||b.name,data,ts,ts).run();
  return json({ id, name:b.name, path:b.path }, 201);
});

router.put('/api/pages/:id', async (req, env, p) => {
  const b = await body(req);
  if (!b.page_data) return err('page_data required');
  const ts=now(), ser=JSON.stringify(b.page_data);
  await env.DB.prepare('UPDATE pages SET page_data=?,updated_at=? WHERE id=?').bind(ser,ts,p.id).run();
  if (b.create_version) {
    const last = await env.DB.prepare('SELECT MAX(version_number) as v FROM page_versions WHERE page_id=?').bind(p.id).first();
    const nextV = (last?.v||0)+1;
    await env.DB.prepare('INSERT INTO page_versions (id,page_id,version_number,page_data,created_at) VALUES (?,?,?,?,?)').bind(uid(),p.id,nextV,ser,ts).run();
  }
  return json({ ok:true, updated_at:ts });
});

router.get('/api/pages/:id/versions', async (req, env, p) => {
  const rows = await env.DB.prepare('SELECT id,version_number,created_at FROM page_versions WHERE page_id=? ORDER BY version_number DESC LIMIT 20').bind(p.id).all();
  return json(rows.results);
});

router.post('/api/pages/:id/restore/:versionId', async (req, env, p) => {
  const v = await env.DB.prepare('SELECT page_data FROM page_versions WHERE id=? AND page_id=?').bind(p.versionId,p.id).first();
  if (!v) return err('Version not found', 404);
  await env.DB.prepare('UPDATE pages SET page_data=?,updated_at=? WHERE id=?').bind(v.page_data,now(),p.id).run();
  return json({ ok:true });
});

router.delete('/api/pages/:id', async (req, env, p) => {
  await env.DB.prepare('DELETE FROM pages WHERE id=?').bind(p.id).run();
  return json({ ok:true });
});

// ── Assets ────────────────────────────────────────────────────
router.post('/api/assets/upload', async (req, env) => {
  let fd;
  try { fd = await req.formData(); } catch { return err('Expected multipart/form-data'); }
  const file = fd.get('file');
  const projectId = fd.get('project_id');
  const userId = req.headers.get('x-user-id') || fd.get('user_id') || 'demo-user';
  if (!file || !projectId) return err('file and project_id required');
  if (file.size > 20*1024*1024) return err('File too large (max 20MB)');
  const id=uid(), ext=file.name.split('.').pop()||'bin', r2Key=`${projectId}/${id}.${ext}`;
  const buf = await file.arrayBuffer();
  await env.ASSETS.put(r2Key, buf, { httpMetadata:{ contentType:file.type }, customMetadata:{ projectId, userId, originalName:file.name } });
  const url = `/api/assets/file/${r2Key}`;
  await env.DB.prepare('INSERT INTO assets (id,project_id,user_id,name,r2_key,url,mime_type,size,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,projectId,userId,file.name,r2Key,url,file.type,file.size,now()).run();
  return json({ id, url, name:file.name, mime_type:file.type, size:file.size }, 201);
});

router.get('/api/assets/file/:projectId/:filename', async (req, env, p) => {
  const obj = await env.ASSETS.get(`${p.projectId}/${p.filename}`);
  if (!obj) return err('Not found', 404);
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('etag', obj.httpEtag);
  h.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers: h });
});

router.get('/api/assets/project/:projectId', async (req, env, p) => {
  const rows = await env.DB.prepare('SELECT id,name,url,mime_type,size,width,height,created_at FROM assets WHERE project_id=? ORDER BY created_at DESC').bind(p.projectId).all();
  return json(rows.results);
});

router.delete('/api/assets/:id', async (req, env, p) => {
  const a = await env.DB.prepare('SELECT r2_key FROM assets WHERE id=?').bind(p.id).first();
  if (!a) return err('Not found', 404);
  await Promise.all([env.ASSETS.delete(a.r2_key), env.DB.prepare('DELETE FROM assets WHERE id=?').bind(p.id).run()]);
  return json({ ok:true });
});

// ── Publish ───────────────────────────────────────────────────
router.post('/api/publish/:projectId', async (req, env, p) => {
  const proj = await env.DB.prepare('SELECT id,slug,name FROM projects WHERE id=?').bind(p.projectId).first();
  if (!proj) return err('Project not found', 404);
  const pages = await env.DB.prepare('SELECT id,name,path,page_data FROM pages WHERE project_id=? ORDER BY sort_order').bind(p.projectId).all();
  if (!pages.results.length) return err('No pages to publish');
  const ts = now(), baseUrl = `https://website-builder.workers.dev/sites/${proj.slug}`;
  const writes = pages.results.map(pg => {
    let doc;
    try { doc = JSON.parse(pg.page_data); } catch { return Promise.reject(new Error(`Bad page_data: ${pg.id}`)); }
    const html = renderPage(doc);
    const safePath = pg.path==='/'?'index':pg.path.replace(/^\//,'').replace(/\//g,':');
    return env.CACHE.put(`site:${proj.slug}:${safePath}`, html, { expirationTtl: 604800 });
  });
  await Promise.all(writes);
  await env.DB.prepare('UPDATE projects SET published_at=?,published_url=?,updated_at=? WHERE id=?').bind(ts,baseUrl,ts,p.projectId).run();
  return json({ ok:true, published_at:ts, url:baseUrl, pages_published:pages.results.length });
});

router.delete('/api/publish/:projectId', async (req, env, p) => {
  const proj = await env.DB.prepare('SELECT slug FROM projects WHERE id=?').bind(p.projectId).first();
  if (!proj) return err('Not found', 404);
  const list = await env.CACHE.list({ prefix:`site:${proj.slug}:` });
  await Promise.all(list.keys.map(k => env.CACHE.delete(k.name)));
  await env.DB.prepare('UPDATE projects SET published_at=NULL,published_url=NULL WHERE id=?').bind(p.projectId).run();
  return json({ ok:true, removed:list.keys.length });
});

router.get('/api/publish/:projectId/preview', async (req, env, p) => {
  const hp = await env.DB.prepare('SELECT p.page_data FROM pages p JOIN projects pr ON pr.id=p.project_id WHERE pr.id=? AND p.is_home=1').bind(p.projectId).first();
  if (!hp) return err('No homepage', 404);
  return new Response(renderPage(JSON.parse(hp.page_data)), { headers:{ 'content-type':'text/html; charset=utf-8' } });
});

// ── Templates ─────────────────────────────────────────────────
router.get('/api/templates', async (req, env) => {
  const cat = new URL(req.url).searchParams.get('category');
  const rows = cat
    ? await env.DB.prepare('SELECT id,name,category,thumbnail,created_at FROM templates WHERE is_public=1 AND category=? ORDER BY created_at DESC').bind(cat).all()
    : await env.DB.prepare('SELECT id,name,category,thumbnail,created_at FROM templates WHERE is_public=1 ORDER BY created_at DESC').all();
  return json(rows.results);
});

router.get('/api/templates/:id', async (req, env, p) => {
  const t = await env.DB.prepare('SELECT * FROM templates WHERE id=?').bind(p.id).first();
  if (!t) return err('Not found', 404);
  return json({ ...t, page_data: JSON.parse(t.page_data) });
});

router.post('/api/templates', async (req, env) => {
  const b = await body(req);
  if (!b.name||!b.category||!b.page_data) return err('name, category, page_data required');
  const id = uid();
  await env.DB.prepare('INSERT INTO templates (id,name,category,thumbnail,page_data,is_public,created_at) VALUES (?,?,?,?,?,1,?)').bind(id,b.name,b.category,b.thumbnail||'',JSON.stringify(b.page_data),now()).run();
  return json({ id }, 201);
});

// ── Serve published sites ─────────────────────────────────────
router.get('/sites/:slug', async (req, env, p) => {
  const cached = await env.CACHE.get(`site:${p.slug}:index`);
  if (cached) return new Response(cached, { headers:{ 'content-type':'text/html; charset=utf-8', 'x-cache':'HIT' } });
  const proj = await env.DB.prepare('SELECT id FROM projects WHERE slug=? AND published_at IS NOT NULL').bind(p.slug).first();
  if (!proj) return err('Site not found', 404);
  const hp = await env.DB.prepare('SELECT page_data FROM pages WHERE project_id=? AND is_home=1').bind(proj.id).first();
  if (!hp) return err('No homepage', 404);
  const html = renderPage(JSON.parse(hp.page_data));
  await env.CACHE.put(`site:${p.slug}:index`, html, { expirationTtl:3600 });
  return new Response(html, { headers:{ 'content-type':'text/html; charset=utf-8', 'x-cache':'MISS' } });
});

// ── Main export ───────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { status:204, headers:cors() });
    try {
      return await router.handle(request, env);
    } catch(e) {
      console.error(e);
      return err(e?.message || 'Internal server error', 500);
    }
  }
};
