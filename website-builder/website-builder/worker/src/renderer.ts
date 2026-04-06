/**
 * Rendering Engine — converts the page JSON data model into clean, minified HTML.
 *
 * PageDocument schema:
 * {
 *   id: string
 *   meta: { title, description, ogImage, favicon }
 *   breakpoints: { desktop: 1440, tablet: 768, mobile: 375 }
 *   nodes: Node[]   ← root-level nodes (usually one "root" container)
 * }
 *
 * Node schema:
 * {
 *   id: string
 *   type: 'container' | 'text' | 'image' | 'button' | 'form' | 'input' | 'html' | 'divider' | 'spacer'
 *   props: Record<string, any>   ← element-specific props (src, href, placeholder…)
 *   styles: {
 *     desktop?: CSSProperties
 *     tablet?: CSSProperties
 *     mobile?: CSSProperties
 *   }
 *   children?: Node[]
 * }
 */

export interface PageMeta {
  title: string;
  description?: string;
  ogImage?: string;
  favicon?: string;
  scripts?: string[];
  customHead?: string;
}

export interface NodeStyles {
  desktop?: Record<string, string>;
  tablet?: Record<string, string>;
  mobile?: Record<string, string>;
}

export interface PageNode {
  id: string;
  type: string;
  props: Record<string, unknown>;
  styles: NodeStyles;
  children?: PageNode[];
  locked?: boolean;
  hidden?: boolean;
}

export interface PageDocument {
  id: string;
  meta: PageMeta;
  breakpoints?: { desktop: number; tablet: number; mobile: number };
  nodes: PageNode[];
}

// ── CSS property name conversion (camelCase → kebab-case) ────
function toKebab(s: string): string {
  return s.replace(/([A-Z])/g, m => '-' + m.toLowerCase());
}

// ── Convert a style object to a CSS rule string ──────────────
function styleObjToString(styles: Record<string, string>): string {
  return Object.entries(styles)
    .map(([k, v]) => `${toKebab(k)}:${v}`)
    .join(';');
}

// ── Collect all styles across the tree and build a <style> block
function collectStyles(nodes: PageNode[], bp: { desktop: number; tablet: number; mobile: number }): string {
  const desktopRules: string[] = [];
  const tabletRules: string[]  = [];
  const mobileRules: string[]  = [];

  function walk(node: PageNode) {
    if (node.hidden) return;
    const { desktop, tablet, mobile } = node.styles;
    if (desktop && Object.keys(desktop).length) {
      desktopRules.push(`.n-${node.id}{${styleObjToString(desktop)}}`);
    }
    if (tablet && Object.keys(tablet).length) {
      tabletRules.push(`.n-${node.id}{${styleObjToString(tablet)}}`);
    }
    if (mobile && Object.keys(mobile).length) {
      mobileRules.push(`.n-${node.id}{${styleObjToString(mobile)}}`);
    }
    node.children?.forEach(walk);
  }

  nodes.forEach(walk);

  const parts: string[] = [];
  // Desktop styles (no media query — mobile-first would flip this, but desktop-first is fine for builders)
  if (desktopRules.length) parts.push(desktopRules.join(''));
  if (tabletRules.length)  parts.push(`@media(max-width:${bp.tablet}px){${tabletRules.join('')}}`);
  if (mobileRules.length)  parts.push(`@media(max-width:${bp.mobile}px){${mobileRules.join('')}}`);

  return parts.join('');
}

// ── Escape HTML special chars ────────────────────────────────
function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Render a single node to HTML ─────────────────────────────
function renderNode(node: PageNode): string {
  if (node.hidden) return '';

  const cls = `n-${node.id}`;
  const p = node.props;

  const children = node.children?.map(renderNode).join('') ?? '';

  switch (node.type) {
    case 'container':
    case 'section':
    case 'row':
    case 'column': {
      const tag = (p.tag as string) || 'div';
      const attrs = p.id ? ` id="${esc(p.id as string)}"` : '';
      return `<${tag} class="${cls}"${attrs}>${children}</${tag}>`;
    }

    case 'text': {
      const tag = (p.tag as string) || 'p';
      const content = (p.html as string) || esc(p.text as string || '');
      return `<${tag} class="${cls}">${content}</${tag}>`;
    }

    case 'heading': {
      const level = (p.level as number) || 2;
      const tag = `h${Math.min(Math.max(level, 1), 6)}`;
      const content = (p.html as string) || esc(p.text as string || '');
      return `<${tag} class="${cls}">${content}</${tag}>`;
    }

    case 'image': {
      const src  = esc((p.src  as string) || '');
      const alt  = esc((p.alt  as string) || '');
      const lazy = p.lazy !== false ? ' loading="lazy"' : '';
      const dim  = p.width ? ` width="${p.width}" height="${p.height || ''}"` : '';
      return `<img class="${cls}" src="${src}" alt="${alt}"${dim}${lazy}>`;
    }

    case 'button': {
      const href   = p.href as string | undefined;
      const target = p.newTab ? ' target="_blank" rel="noopener noreferrer"' : '';
      const label  = esc((p.label as string) || 'Button');
      if (href) {
        return `<a href="${esc(href)}" class="${cls}"${target}>${label}</a>`;
      }
      const btnType = (p.btnType as string) || 'button';
      return `<button type="${btnType}" class="${cls}">${label}</button>`;
    }

    case 'form': {
      const action = esc((p.action as string) || '#');
      const method = esc((p.method as string) || 'POST');
      return `<form class="${cls}" action="${action}" method="${method}">${children}</form>`;
    }

    case 'input': {
      const type        = esc((p.type        as string) || 'text');
      const name        = esc((p.name        as string) || '');
      const placeholder = esc((p.placeholder as string) || '');
      const required    = p.required ? ' required' : '';
      return `<input class="${cls}" type="${type}" name="${name}" placeholder="${placeholder}"${required}>`;
    }

    case 'textarea': {
      const name        = esc((p.name        as string) || '');
      const placeholder = esc((p.placeholder as string) || '');
      const rows        = (p.rows as number) || 4;
      return `<textarea class="${cls}" name="${name}" placeholder="${placeholder}" rows="${rows}"></textarea>`;
    }

    case 'divider':
      return `<hr class="${cls}">`;

    case 'spacer':
      return `<div class="${cls}" aria-hidden="true"></div>`;

    case 'video': {
      const src     = esc((p.src as string) || '');
      const controls = p.controls !== false ? ' controls' : '';
      const autoplay = p.autoplay ? ' autoplay muted playsinline' : '';
      return `<video class="${cls}" src="${src}"${controls}${autoplay}></video>`;
    }

    case 'embed': {
      // YouTube / generic iframe
      const src = esc((p.src as string) || '');
      return `<div class="${cls}"><iframe src="${src}" loading="lazy" allowfullscreen></iframe></div>`;
    }

    case 'html': {
      // Raw HTML block — user is responsible for content
      const raw = (p.html as string) || '';
      return `<div class="${cls}">${raw}</div>`;
    }

    case 'icon': {
      // SVG sprite or simple emoji fallback
      const icon = esc((p.icon as string) || '★');
      return `<span class="${cls}" aria-hidden="true">${icon}</span>`;
    }

    case 'list': {
      const tag   = p.ordered ? 'ol' : 'ul';
      const items = ((p.items as string[]) || [])
        .map(item => `<li>${esc(item)}</li>`).join('');
      return `<${tag} class="${cls}">${items}</${tag}>`;
    }

    default:
      return `<div class="${cls}">${children}</div>`;
  }
}

// ── Base reset + sensible defaults ───────────────────────────
const BASE_CSS = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1a1a1a}img,video{max-width:100%;display:block}a{color:inherit}button{cursor:pointer}`;

// ── Main render entry point ───────────────────────────────────
export function renderPage(doc: PageDocument): string {
  const bp = doc.breakpoints ?? { desktop: 1440, tablet: 768, mobile: 375 };
  const meta = doc.meta ?? { title: 'Untitled' };

  const bodyHTML = doc.nodes.map(renderNode).join('');
  const customCSS = collectStyles(doc.nodes, bp);

  const faviconTag = meta.favicon
    ? `<link rel="icon" href="${esc(meta.favicon)}">`
    : '';

  const ogTags = [
    meta.description ? `<meta name="description" content="${esc(meta.description)}">` : '',
    `<meta property="og:title" content="${esc(meta.title)}">`,
    meta.description ? `<meta property="og:description" content="${esc(meta.description)}">` : '',
    meta.ogImage ? `<meta property="og:image" content="${esc(meta.ogImage)}">` : '',
  ].filter(Boolean).join('');

  const extraScripts = (meta.scripts ?? [])
    .map(src => `<script src="${esc(src)}" defer></script>`)
    .join('');

  const customHead = meta.customHead ?? '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(meta.title)}</title>
${faviconTag}${ogTags}
<style>${BASE_CSS}${customCSS}</style>
${customHead}${extraScripts}
</head>
<body>
${bodyHTML}
</body>
</html>`;
}

// ── Preview render (no minification, adds editing hints) ──────
export function renderPreview(doc: PageDocument): string {
  return renderPage(doc); // same output — editor uses iframe with live JSON
}
