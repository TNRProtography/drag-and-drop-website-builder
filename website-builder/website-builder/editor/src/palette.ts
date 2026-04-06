import type { PaletteItem } from './types';

export const PALETTE: PaletteItem[] = [
  // ── Layout ─────────────────────────────────────────────────
  {
    type: 'section',
    label: 'Section',
    icon: '▭',
    defaultStyles: {
      desktop: {
        padding: '60px 20px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      },
    },
    defaultChildren: [],
  },
  {
    type: 'container',
    label: 'Container',
    icon: '⬜',
    defaultStyles: {
      desktop: {
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        padding: '20px',
      },
    },
    defaultChildren: [],
  },
  {
    type: 'row',
    label: 'Row',
    icon: '≡',
    defaultStyles: {
      desktop: { display: 'flex', flexDirection: 'row', gap: '20px', width: '100%', flexWrap: 'wrap' },
    },
    defaultChildren: [
      {
        id: '__col1__',
        type: 'column',
        props: {},
        styles: { desktop: { flex: '1', minWidth: '200px' } },
        children: [],
      },
      {
        id: '__col2__',
        type: 'column',
        props: {},
        styles: { desktop: { flex: '1', minWidth: '200px' } },
        children: [],
      },
    ],
  },
  {
    type: 'column',
    label: 'Column',
    icon: '|',
    defaultStyles: {
      desktop: { flex: '1', display: 'flex', flexDirection: 'column', gap: '12px' },
    },
    defaultChildren: [],
  },

  // ── Text ───────────────────────────────────────────────────
  {
    type: 'heading',
    label: 'Heading',
    icon: 'H',
    defaultProps: { text: 'Your heading here', level: 2 },
    defaultStyles: {
      desktop: {
        fontSize: '2.5rem',
        fontWeight: '700',
        lineHeight: '1.2',
        color: '#111111',
        margin: '0 0 16px',
      },
    },
  },
  {
    type: 'text',
    label: 'Text',
    icon: 'T',
    defaultProps: { text: 'Click to edit this text block. You can change the content, font, size, and color in the inspector panel on the right.' },
    defaultStyles: {
      desktop: {
        fontSize: '1rem',
        lineHeight: '1.7',
        color: '#444444',
        margin: '0 0 12px',
      },
    },
  },

  // ── Media ──────────────────────────────────────────────────
  {
    type: 'image',
    label: 'Image',
    icon: '🖼',
    defaultProps: { src: 'https://placehold.co/800x400/e2e8f0/94a3b8?text=Image', alt: 'Image', lazy: true },
    defaultStyles: {
      desktop: { width: '100%', borderRadius: '8px', display: 'block' },
    },
  },
  {
    type: 'video',
    label: 'Video',
    icon: '▶',
    defaultProps: { src: '', controls: true },
    defaultStyles: {
      desktop: { width: '100%', borderRadius: '8px' },
    },
  },
  {
    type: 'embed',
    label: 'Embed',
    icon: '⊞',
    defaultProps: { src: '' },
    defaultStyles: {
      desktop: {
        position: 'relative',
        paddingBottom: '56.25%',
        height: '0',
        overflow: 'hidden',
      },
    },
  },

  // ── Interactive ────────────────────────────────────────────
  {
    type: 'button',
    label: 'Button',
    icon: '◻',
    defaultProps: { label: 'Click me', href: '' },
    defaultStyles: {
      desktop: {
        display: 'inline-block',
        padding: '12px 28px',
        backgroundColor: '#2563eb',
        color: '#ffffff',
        borderRadius: '6px',
        fontWeight: '600',
        fontSize: '1rem',
        textDecoration: 'none',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
      },
    },
  },
  {
    type: 'form',
    label: 'Form',
    icon: '☰',
    defaultProps: { action: '#', method: 'POST' },
    defaultStyles: {
      desktop: { display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' },
    },
    defaultChildren: [
      {
        id: '__input1__',
        type: 'input',
        props: { type: 'text', name: 'name', placeholder: 'Your name' },
        styles: {
          desktop: {
            padding: '10px 14px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '1rem',
            width: '100%',
          },
        },
      },
      {
        id: '__input2__',
        type: 'input',
        props: { type: 'email', name: 'email', placeholder: 'Email address' },
        styles: {
          desktop: {
            padding: '10px 14px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '1rem',
            width: '100%',
          },
        },
      },
      {
        id: '__submit__',
        type: 'button',
        props: { label: 'Submit', btnType: 'submit' },
        styles: {
          desktop: {
            padding: '12px 24px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
          },
        },
      },
    ],
  },
  {
    type: 'input',
    label: 'Input',
    icon: '▱',
    defaultProps: { type: 'text', placeholder: 'Enter text...' },
    defaultStyles: {
      desktop: {
        padding: '10px 14px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '1rem',
        width: '100%',
      },
    },
  },

  // ── Decorative ─────────────────────────────────────────────
  {
    type: 'divider',
    label: 'Divider',
    icon: '—',
    defaultStyles: {
      desktop: {
        border: 'none',
        borderTop: '1px solid #e5e7eb',
        margin: '24px 0',
        width: '100%',
      },
    },
  },
  {
    type: 'spacer',
    label: 'Spacer',
    icon: '↕',
    defaultStyles: {
      desktop: { height: '48px', width: '100%' },
    },
  },
  {
    type: 'html',
    label: 'HTML Block',
    icon: '</>',
    defaultProps: { html: '<!-- Custom HTML -->' },
    defaultStyles: { desktop: { width: '100%' } },
  },
];

export const PALETTE_BY_TYPE = Object.fromEntries(PALETTE.map(p => [p.type, p]));
