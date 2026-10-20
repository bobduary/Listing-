// Browser entry helper: hydrates the server-rendered page so menus, the
// cart, forms and other interactive parts come alive.
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { makeComponent } from './dc.js';

export function mount(pageDef, importDefs) {
  const ctx = { components: {} };
  for (const name in importDefs) ctx.components[name] = makeComponent(importDefs[name], ctx);
  const Page = makeComponent(pageDef, ctx);
  const root = document.getElementById('dc-root');
  // Pages that read browser-only state (e.g. the saved cart) can differ from
  // the static HTML; React then re-renders on the client, which is fine.
  hydrateRoot(root, React.createElement(Page, window.__DC_PROPS__ || null), { onRecoverableError() {} });
}
