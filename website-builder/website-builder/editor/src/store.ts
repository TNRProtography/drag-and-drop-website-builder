import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { PageNode, PageDocument, PageMeta, Breakpoint, HistoryEntry } from './types';

const MAX_HISTORY = 50;

// ── Helpers ───────────────────────────────────────────────────
function findNodeById(nodes: PageNode[], id: string): PageNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function updateNodeById(nodes: PageNode[], id: string, updater: (n: PageNode) => void): PageNode[] {
  return nodes.map(node => {
    if (node.id === id) { updater(node); return node; }
    if (node.children) node.children = updateNodeById(node.children, id, updater);
    return node;
  });
}

function deleteNodeById(nodes: PageNode[], id: string): PageNode[] {
  return nodes
    .filter(n => n.id !== id)
    .map(n => ({ ...n, children: n.children ? deleteNodeById(n.children, id) : n.children }));
}

function insertNodeAt(nodes: PageNode[], parentId: string | null, node: PageNode, index: number): PageNode[] {
  if (parentId === null) {
    const next = [...nodes];
    next.splice(index, 0, node);
    return next;
  }
  return nodes.map(n => {
    if (n.id === parentId) {
      const children = [...(n.children ?? [])];
      children.splice(index, 0, node);
      return { ...n, children };
    }
    if (n.children) return { ...n, children: insertNodeAt(n.children, parentId, node, index) };
    return n;
  });
}

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

// ── State interface ───────────────────────────────────────────
export interface EditorState {
  // Document
  doc: PageDocument;
  isDirty: boolean;
  isSaving: boolean;
  projectId: string | null;
  pageId: string | null;

  // Selection & interaction
  selectedId: string | null;
  hoveredId: string | null;
  breakpoint: Breakpoint;
  isPreview: boolean;
  panelTab: 'layers' | 'components' | 'assets';
  inspectorTab: 'style' | 'layout' | 'advanced';

  // History (undo/redo)
  history: HistoryEntry[];
  historyIndex: number;

  // Actions
  setDoc(doc: PageDocument): void;
  setProjectId(id: string): void;
  setPageId(id: string): void;

  selectNode(id: string | null): void;
  hoverNode(id: string | null): void;
  setBreakpoint(bp: Breakpoint): void;
  togglePreview(): void;
  setPanelTab(t: 'layers' | 'components' | 'assets'): void;
  setInspectorTab(t: 'style' | 'layout' | 'advanced'): void;

  // Node mutations (all push history)
  addNode(node: PageNode, parentId: string | null, index?: number): void;
  updateNodeProps(id: string, props: Record<string, unknown>): void;
  updateNodeStyles(id: string, styles: Record<string, string>, breakpoint?: Breakpoint): void;
  deleteNode(id: string): void;
  moveNode(id: string, newParentId: string | null, newIndex: number): void;
  duplicateNode(id: string): void;
  toggleHidden(id: string): void;
  toggleLocked(id: string): void;
  renameNode(id: string, name: string): void;
  updateMeta(meta: Partial<PageMeta>): void;

  // History
  undo(): void;
  redo(): void;
  pushHistory(label: string): void;

  // Persistence state
  markSaving(v: boolean): void;
  markClean(): void;
}

// ── Default empty document ────────────────────────────────────
function emptyDoc(): PageDocument {
  return {
    id: 'page',
    meta: { title: 'My Page' },
    breakpoints: { desktop: 1440, tablet: 768, mobile: 375 },
    nodes: [{
      id: 'root',
      type: 'container',
      name: 'Page root',
      props: {},
      styles: { desktop: { minHeight: '100vh', display: 'flex', flexDirection: 'column' } },
      children: [],
    }],
  };
}

// ── Store ─────────────────────────────────────────────────────
export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    doc: emptyDoc(),
    isDirty: false,
    isSaving: false,
    projectId: null,
    pageId: null,

    selectedId: null,
    hoveredId: null,
    breakpoint: 'desktop',
    isPreview: false,
    panelTab: 'components',
    inspectorTab: 'style',

    history: [],
    historyIndex: -1,

    // ── Setters ──────────────────────────────────────────────
    setDoc: (doc) => set(s => { s.doc = doc; s.isDirty = false; }),
    setProjectId: (id) => set(s => { s.projectId = id; }),
    setPageId: (id) => set(s => { s.pageId = id; }),

    selectNode: (id) => set(s => { s.selectedId = id; }),
    hoverNode: (id) => set(s => { s.hoveredId = id; }),
    setBreakpoint: (bp) => set(s => { s.breakpoint = bp; }),
    togglePreview: () => set(s => { s.isPreview = !s.isPreview; }),
    setPanelTab: (t) => set(s => { s.panelTab = t; }),
    setInspectorTab: (t) => set(s => { s.inspectorTab = t; }),
    markSaving: (v) => set(s => { s.isSaving = v; }),
    markClean: () => set(s => { s.isDirty = false; }),

    // ── History ───────────────────────────────────────────────
    pushHistory: (label) => set(s => {
      const entry: HistoryEntry = {
        nodes: deepClone(s.doc.nodes),
        timestamp: Date.now(),
        label,
      };
      // Truncate forward history on new action
      s.history = s.history.slice(0, s.historyIndex + 1);
      s.history.push(entry);
      if (s.history.length > MAX_HISTORY) s.history.shift();
      s.historyIndex = s.history.length - 1;
      s.isDirty = true;
    }),

    undo: () => set(s => {
      if (s.historyIndex <= 0) return;
      s.historyIndex -= 1;
      s.doc.nodes = deepClone(s.history[s.historyIndex].nodes);
      s.isDirty = true;
    }),

    redo: () => set(s => {
      if (s.historyIndex >= s.history.length - 1) return;
      s.historyIndex += 1;
      s.doc.nodes = deepClone(s.history[s.historyIndex].nodes);
      s.isDirty = true;
    }),

    // ── Node mutations ────────────────────────────────────────
    addNode: (node, parentId, index = 0) => {
      get().pushHistory(`Add ${node.type}`);
      set(s => {
        s.doc.nodes = insertNodeAt(s.doc.nodes, parentId, node, index);
        s.selectedId = node.id;
      });
    },

    updateNodeProps: (id, props) => {
      get().pushHistory('Update props');
      set(s => {
        s.doc.nodes = updateNodeById(s.doc.nodes, id, n => {
          n.props = { ...n.props, ...props };
        });
      });
    },

    updateNodeStyles: (id, styles, breakpoint) => {
      const bp = breakpoint ?? get().breakpoint;
      get().pushHistory('Update styles');
      set(s => {
        s.doc.nodes = updateNodeById(s.doc.nodes, id, n => {
          n.styles[bp] = { ...(n.styles[bp] ?? {}), ...styles };
        });
      });
    },

    deleteNode: (id) => {
      get().pushHistory(`Delete node`);
      set(s => {
        s.doc.nodes = deleteNodeById(s.doc.nodes, id);
        if (s.selectedId === id) s.selectedId = null;
      });
    },

    moveNode: (id, newParentId, newIndex) => {
      get().pushHistory('Move node');
      set(s => {
        const node = findNodeById(s.doc.nodes, id);
        if (!node) return;
        const clone = deepClone(node);
        s.doc.nodes = deleteNodeById(s.doc.nodes, id);
        s.doc.nodes = insertNodeAt(s.doc.nodes, newParentId, clone, newIndex);
      });
    },

    duplicateNode: (id) => {
      get().pushHistory('Duplicate node');
      set(s => {
        const node = findNodeById(s.doc.nodes, id);
        if (!node) return;
        const clone = deepClone(node);
        // Reassign IDs recursively
        const reId = (n: PageNode): PageNode => ({
          ...n,
          id: crypto.randomUUID(),
          children: n.children?.map(reId),
        });
        const newNode = reId(clone);
        // Insert after the original (find its parent and index)
        // Simplified: insert at root level for now
        const idx = s.doc.nodes.findIndex(n => n.id === id);
        if (idx >= 0) {
          s.doc.nodes.splice(idx + 1, 0, newNode);
        } else {
          s.doc.nodes.push(newNode);
        }
        s.selectedId = newNode.id;
      });
    },

    toggleHidden: (id) => {
      get().pushHistory('Toggle visibility');
      set(s => {
        s.doc.nodes = updateNodeById(s.doc.nodes, id, n => { n.hidden = !n.hidden; });
      });
    },

    toggleLocked: (id) => set(s => {
      s.doc.nodes = updateNodeById(s.doc.nodes, id, n => { n.locked = !n.locked; });
    }),

    renameNode: (id, name) => set(s => {
      s.doc.nodes = updateNodeById(s.doc.nodes, id, n => { n.name = name; });
    }),

    updateMeta: (meta) => {
      get().pushHistory('Update meta');
      set(s => {
        s.doc.meta = { ...s.doc.meta, ...meta };
        s.isDirty = true;
      });
    },
  }))
);

// ── Selectors ─────────────────────────────────────────────────
export const selectNode = (id: string | null) => (s: EditorState) =>
  id ? findNodeById(s.doc.nodes, id) : null;

export const selectCanUndo = (s: EditorState) => s.historyIndex > 0;
export const selectCanRedo = (s: EditorState) => s.historyIndex < s.history.length - 1;
