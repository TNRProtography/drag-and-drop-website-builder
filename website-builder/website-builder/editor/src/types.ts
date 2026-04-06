// ─────────────────────────────────────────────────────────────
// Types — shared across the entire editor
// ─────────────────────────────────────────────────────────────

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export type NodeType =
  | 'container' | 'section' | 'row' | 'column'
  | 'text' | 'heading' | 'image' | 'button'
  | 'form' | 'input' | 'textarea'
  | 'divider' | 'spacer' | 'video' | 'embed'
  | 'html' | 'icon' | 'list';

export interface NodeStyles {
  desktop?: Record<string, string>;
  tablet?: Record<string, string>;
  mobile?: Record<string, string>;
}

export interface PageNode {
  id: string;
  type: NodeType;
  props: Record<string, unknown>;
  styles: NodeStyles;
  children?: PageNode[];
  locked?: boolean;
  hidden?: boolean;
  name?: string; // user-given label in layers panel
}

export interface PageMeta {
  title: string;
  description?: string;
  ogImage?: string;
  favicon?: string;
  customHead?: string;
}

export interface PageDocument {
  id: string;
  meta: PageMeta;
  breakpoints: { desktop: number; tablet: number; mobile: number };
  nodes: PageNode[];
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  published_at?: number;
  published_url?: string;
  pages: PageSummary[];
}

export interface PageSummary {
  id: string;
  name: string;
  path: string;
  title?: string;
  is_home?: boolean;
}

export interface Asset {
  id: string;
  name: string;
  url: string;
  mime_type: string;
  size: number;
  width?: number;
  height?: number;
}

// ── Editor history entry (undo/redo) ─────────────────────────
export interface HistoryEntry {
  nodes: PageNode[];
  timestamp: number;
  label: string;
}

// ── Component palette item ────────────────────────────────────
export interface PaletteItem {
  type: NodeType;
  label: string;
  icon: string;
  defaultProps?: Record<string, unknown>;
  defaultStyles?: NodeStyles;
  defaultChildren?: PageNode[];
}
