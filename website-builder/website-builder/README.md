# ⬡ Website Builder — Deployment Guide

## Infrastructure (already provisioned)

| Resource | Name | ID |
|---|---|---|
| D1 Database | `website-builder-db` | `743ab514-0f5c-4f7a-a661-b7db86fec085` |
| KV Namespace | `WEBSITE_BUILDER_CACHE` | `7b0337b19df14b0686fafae709a2d3f8` |
| R2 Bucket | `website-builder-assets` | `website-builder-assets` |
| Worker | `website-builder` | `b3f9aa18afcd4ed08e0fcecf2a618093` |
| Account ID | — | `4d71ca02a65fe3fe95081fcc37a70e2a` |

---

## Folder Structure

```
website-builder/
├── worker/                   # Cloudflare Worker (API backend)
│   ├── src/
│   │   ├── index.ts          # Main entry + router mounting + site serving
│   │   ├── router.ts         # Lightweight URL router (no dependencies)
│   │   ├── utils.ts          # uid, jsonResponse, cors, slugify
│   │   ├── renderer.ts       # JSON → HTML rendering engine
│   │   └── routes/
│   │       ├── projects.ts   # CRUD: projects
│   │       ├── pages.ts      # CRUD: pages + versioning
│   │       ├── assets.ts     # R2 upload/serve/delete
│   │       ├── publish.ts    # Render + store in KV + mark published
│   │       └── templates.ts  # Template gallery
│   ├── wrangler.toml         # ← all bindings already filled in
│   ├── tsconfig.json
│   └── package.json
│
├── editor/                   # React SPA (Cloudflare Pages)
│   ├── src/
│   │   ├── main.tsx          # React entry point
│   │   ├── App.tsx           # Full editor UI (canvas, sidebars, topbar)
│   │   ├── store.ts          # Zustand + immer state store
│   │   ├── types.ts          # Shared TypeScript types
│   │   ├── palette.ts        # Component palette definitions
│   │   └── index.css         # Global reset + scrollbar styles
│   ├── index.html
│   ├── vite.config.ts        # Vite + dev proxy → worker
│   └── package.json
│
└── example-page.ts           # Example page JSON + rendered HTML
```

---

## Step 1 — Deploy the Worker

```bash
cd worker
npm install
npm run deploy
# → https://website-builder.YOURSUBDOMAIN.workers.dev
```

The `wrangler.toml` already has all binding IDs filled in. No changes needed.

## Step 2 — Deploy the Editor (Cloudflare Pages)

```bash
cd editor
npm install
npm run build

# Option A — Wrangler CLI:
wrangler pages deploy dist --project-name website-builder-editor

# Option B — Connect your GitHub repo in the Cloudflare dashboard:
# Build command:  npm run build
# Output dir:     dist
# Root dir:       editor/
```

Set the `VITE_API_URL` env var in your Pages project to your worker URL:
```
VITE_API_URL=https://website-builder.YOURSUBDOMAIN.workers.dev
```

Then in `vite.config.ts` replace the proxy target, or use:
```typescript
const API = import.meta.env.VITE_API_URL ?? '/api';
```

## Step 3 — Local Development

```bash
# Terminal 1 — Worker (hot reload)
cd worker && npx wrangler dev

# Terminal 2 — Editor (Vite, proxies /api to :8787)
cd editor && npm run dev
# → http://localhost:3000
```

---

## API Reference

### Projects
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects?user_id=X` | List user's projects |
| `POST` | `/api/projects` | Create project (auto-creates homepage) |
| `GET` | `/api/projects/:id` | Get project + pages |
| `PATCH` | `/api/projects/:id` | Update name/description/settings |
| `DELETE` | `/api/projects/:id` | Delete project |

### Pages
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/pages/project/:projectId` | List pages |
| `GET` | `/api/pages/:id` | Get full page with data |
| `POST` | `/api/pages` | Create page |
| `PUT` | `/api/pages/:id` | Save page data (optionally snapshot version) |
| `GET` | `/api/pages/:id/versions` | List version history |
| `POST` | `/api/pages/:id/restore/:versionId` | Restore a version |
| `DELETE` | `/api/pages/:id` | Delete page |

### Assets
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/assets/upload` | Upload file (multipart/form-data) |
| `GET` | `/api/assets/file/:projectId/:filename` | Serve file from R2 |
| `GET` | `/api/assets/project/:projectId` | List project assets |
| `DELETE` | `/api/assets/:id` | Delete asset |

### Publish
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/publish/:projectId` | Render all pages → KV, mark published |
| `DELETE` | `/api/publish/:projectId` | Unpublish (remove from KV) |
| `GET` | `/api/publish/:projectId/preview` | Get rendered HTML for preview |

### Published Sites
| Method | Path | Description |
|---|---|---|
| `GET` | `/sites/:slug` | Serve published site (from KV cache) |

---

## Editor Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/⌘ + Z` | Undo |
| `Ctrl/⌘ + Y` or `Ctrl/⌘ + Shift + Z` | Redo |
| `Ctrl/⌘ + S` | Save |
| `Escape` | Deselect |
| `Delete` / `Backspace` | Delete selected node |
| Double-click | Inline text edit |

---

## Page JSON Schema

```typescript
interface PageDocument {
  id: string;
  meta: {
    title: string;          // <title> and og:title
    description?: string;   // meta description + og:description
    ogImage?: string;       // og:image URL
    favicon?: string;       // favicon href
    customHead?: string;    // raw HTML injected into <head>
  };
  breakpoints: {
    desktop: number;        // default 1440px
    tablet: number;         // default 768px
    mobile: number;         // default 375px
  };
  nodes: Node[];            // root-level nodes (usually one root container)
}

interface Node {
  id: string;               // unique ID (crypto.randomUUID)
  type: NodeType;           // see palette.ts for all types
  name?: string;            // display name in layers panel
  props: {                  // element-specific content
    text?: string;          // for text/heading nodes
    html?: string;          // for html/text nodes (raw HTML)
    src?: string;           // for image/video
    alt?: string;           // for image
    href?: string;          // for button/link
    label?: string;         // for button
    level?: number;         // for heading (1–6)
    // ... other type-specific props
  };
  styles: {
    desktop?: CSSProperties;   // applied at all widths
    tablet?: CSSProperties;    // @media (max-width: 768px)
    mobile?: CSSProperties;    // @media (max-width: 375px)
  };
  children?: Node[];          // container/section/row/column/form only
  hidden?: boolean;           // skip in render
  locked?: boolean;           // prevent edits in editor
}
```

---

## Advanced Features (Ready to Enable)

### Real-time Collaboration (Durable Objects)
Add to `wrangler.toml`:
```toml
[[durable_objects.bindings]]
name       = "COLLAB"
class_name = "CollabSession"
```
Then create `src/collab.ts` — a Durable Object that holds page state in memory
and broadcasts mutations via WebSocket to all connected editors.

### Custom Domains
Update `wrangler.toml` routes section and handle CNAME setup via Cloudflare dashboard.

### Image Transforms (Cloudflare Images)
Replace R2 URLs with `https://imagedelivery.net/...` variants for automatic
WebP conversion, resizing, and optimization.

### Plugin System
Each component type can be registered via `registerNodeType(type, renderer, inspectorPanel)`.
The palette, canvas renderer, and HTML renderer all read from a central registry.
