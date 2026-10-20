// Renders a compiled .dc.html template tree with React. Shared by the
// static build (server render) and the browser bundle (hydration).
//
// Tree format (produced by scripts/build.mjs):
//   string                      -> text, may contain {{holes}}
//   [tag, attrs, children]      -> element / sc-for / sc-if / dc-import
import React from 'react';
import { ROUTES } from '../routes.js';

const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
const WHOLE = /^\{\{\s*([^}]+?)\s*\}\}$/;

const ATTR_NAMES = {
  class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly',
  maxlength: 'maxLength', minlength: 'minLength', autocomplete: 'autoComplete',
  autofocus: 'autoFocus', colspan: 'colSpan', rowspan: 'rowSpan', srcset: 'srcSet',
  crossorigin: 'crossOrigin', enctype: 'encType', inputmode: 'inputMode',
  novalidate: 'noValidate', datetime: 'dateTime', charset: 'charSet',
  allowfullscreen: 'allowFullScreen', frameborder: 'frameBorder', playsinline: 'playsInline',
  referrerpolicy: 'referrerPolicy', fetchpriority: 'fetchPriority', 'xlink:href': 'xlinkHref',
  'xml:space': 'xmlSpace', spellcheck: 'spellCheck', contenteditable: 'contentEditable',
};
const BOOL_ATTRS = new Set(['disabled', 'checked', 'selected', 'required', 'multiple', 'hidden',
  'open', 'readOnly', 'autoFocus', 'noValidate', 'allowFullScreen', 'playsInline', 'muted',
  'autoplay', 'loop', 'controls', 'defer', 'async']);

function literal(expr) {
  if (expr === 'true') return { v: true };
  if (expr === 'false') return { v: false };
  if (expr === 'null') return { v: null };
  if (/^-?\d+(\.\d+)?$/.test(expr)) return { v: Number(expr) };
  const q = expr.match(/^(['"])(.*)\1$/);
  if (q) return { v: q[2] };
  return null;
}

function lookup(expr, scope) {
  const lit = literal(expr);
  if (lit) return lit.v;
  const parts = expr.split('.');
  let cur;
  const head = parts[0];
  for (let i = scope.length - 1; i >= 0; i--) {
    if (scope[i] && Object.prototype.hasOwnProperty.call(scope[i], head)) { cur = scope[i][head]; break; }
  }
  for (let i = 1; i < parts.length; i++) {
    if (cur == null) return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}

function toText(v) {
  if (v == null || v === false || v === true) return '';
  return String(v);
}

function interpolate(str, scope) {
  return str.replace(HOLE, (_, e) => toText(lookup(e, scope)));
}

function value(raw, scope) {
  const m = raw.match(WHOLE);
  if (m) return lookup(m[1], scope);
  return raw.indexOf('{{') === -1 ? raw : interpolate(raw, scope);
}

export function mapHref(v) {
  if (typeof v !== 'string') return v;
  const m = v.match(/^\/?([A-Za-z0-9_]+)\.dc\.html(#.*)?$/);
  if (!m || !ROUTES[m[1]]) return v;
  return ROUTES[m[1]] + (m[2] || '');
}

function camel(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

// Splits a CSS declaration list on top-level semicolons (ignores ones in
// parentheses or quotes, e.g. inside url(...)).
export function parseStyle(css) {
  const out = {};
  let depth = 0, quote = null, start = 0;
  const decls = [];
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ';' && depth === 0) { decls.push(css.slice(start, i)); start = i + 1; }
  }
  decls.push(css.slice(start));
  for (const d of decls) {
    const k = d.indexOf(':');
    if (k === -1) continue;
    const prop = d.slice(0, k).trim();
    const val = d.slice(k + 1).trim();
    if (!prop || val === '') continue;
    if (prop.startsWith('--')) out[prop] = val;
    else {
      let p = camel(prop.toLowerCase());
      if (p.startsWith('Ms')) p = 'ms' + p.slice(2);
      out[p] = val;
    }
  }
  return out;
}

// style-hover="..." / style-focus="..." etc.: state styles the canvas runtime
// supports. Each becomes a generated class whose rule beats the inline style.
export const pseudoRules = new Map();

function importantify(css) {
  return css.split(';').map((d) => d.trim()).filter(Boolean)
    .map((d) => (/!\s*important$/i.test(d) ? d : d + ' !important')).join(';');
}

function pseudoClass(pseudo, css) {
  const k = pseudo + '|' + css;
  let h = 5381;
  for (let i = 0; i < k.length; i++) h = ((h * 33) ^ k.charCodeAt(i)) >>> 0;
  const cls = 'scp' + h.toString(36);
  if (!pseudoRules.has(cls)) {
    const el = pseudo === 'before' || pseudo === 'after';
    pseudoRules.set(cls, '.' + cls + (el ? '::' : ':') + pseudo + '{' + (el ? css : importantify(css)) + '}');
    if (typeof document !== 'undefined') injectPseudoRules();
  }
  return cls;
}

let sheetEl = null;
const injected = new Set();
export function injectPseudoRules() {
  if (!sheetEl) {
    sheetEl = document.getElementById('dc-pseudo') || document.createElement('style');
    if (!sheetEl.parentNode) document.head.appendChild(sheetEl);
    for (const m of sheetEl.textContent.matchAll(/\.(scp[a-z0-9]+)/g)) injected.add(m[1]);
  }
  for (const [cls, rule] of pseudoRules) {
    if (injected.has(cls)) continue;
    injected.add(cls);
    sheetEl.appendChild(document.createTextNode(rule + '\n'));
  }
}

function propName(name) {
  if (ATTR_NAMES[name]) return ATTR_NAMES[name];
  if (/^on[A-Z]/.test(name)) return name;
  if (name.startsWith('data-') || name.startsWith('aria-')) return name;
  if (name.includes('-')) return camel(name);
  return name;
}

function buildProps(tag, attrs, scope, key) {
  const props = { key };
  const hasChange = 'onChange' in attrs;
  const pseudo = [];
  for (const name in attrs) {
    if (name.startsWith('hint-')) continue;
    if (name.startsWith('style-')) { pseudo.push(pseudoClass(name.slice(6), attrs[name])); continue; }
    let v = value(attrs[name], scope);
    let p = propName(name);
    if (/^on[A-Z]/.test(p)) {
      if (typeof v !== 'function') continue;
      if (p === 'onInput' && !hasChange) p = 'onChange';
      props[p] = v;
      continue;
    }
    if (p === 'style') {
      if (typeof v === 'string') props.style = parseStyle(v);
      else if (v && typeof v === 'object') props.style = v;
      continue;
    }
    if (p === 'href') v = mapHref(v);
    if (BOOL_ATTRS.has(p)) {
      if (v === '' || v === true || v === p || v === 'true') v = true;
      else if (v === false || v == null || v === 'false') continue;
    }
    if (v == null || v === false && !p.startsWith('aria-')) continue;
    props[p] = v;
  }
  if (pseudo.length) props.className = [props.className, ...pseudo].filter(Boolean).join(' ');
  // Uncontrolled form fields keep working when the template binds no handler.
  const changeable = props.onChange || props.onInput;
  if ((tag === 'input' || tag === 'textarea' || tag === 'select') && 'value' in props && !changeable) {
    props.defaultValue = props.value; delete props.value;
  }
  if (tag === 'input' && 'checked' in props && !changeable && !props.onClick) {
    props.defaultChecked = props.checked; delete props.checked;
  }
  if (tag === 'option' && 'selected' in props) delete props.selected;
  return props;
}

export function renderNodes(nodes, scope, ctx) {
  const out = [];
  for (let i = 0; i < nodes.length; i++) {
    const r = renderNode(nodes[i], scope, ctx, i);
    if (r == null || r === '') continue;
    if (Array.isArray(r)) out.push(...r); else out.push(r);
  }
  return out;
}

function renderNode(node, scope, ctx, key) {
  if (typeof node === 'string') {
    return node.indexOf('{{') === -1 ? node : interpolate(node, scope);
  }
  const [tag, attrs, children] = node;
  if (tag === 'sc-for') {
    const list = value(attrs.list || '', scope);
    if (!Array.isArray(list)) return null;
    const as = attrs.as || 'item';
    return list.map((item, idx) => React.createElement(React.Fragment, { key: key + ':' + idx },
      ...renderNodes(children, scope.concat([{ [as]: item, $index: idx }]), ctx)));
  }
  if (tag === 'sc-if') {
    const v = value(attrs.value || '', scope);
    if (!v) return null;
    return React.createElement(React.Fragment, { key }, ...renderNodes(children, scope, ctx));
  }
  if (tag === 'dc-import') {
    const Comp = ctx.components[attrs.name];
    if (!Comp) return null;
    const props = { key };
    for (const name in attrs) {
      if (name === 'name' || name.startsWith('hint-')) continue;
      props[camel(name)] = value(attrs[name], scope);
    }
    return React.createElement(Comp, props);
  }
  const props = buildProps(tag, attrs, scope, key);
  if (tag === 'style' || tag === 'script') {
    props.dangerouslySetInnerHTML = { __html: children.join('') };
    return React.createElement(tag, props);
  }
  if (tag === 'textarea') {
    const text = renderNodes(children, scope, ctx).join('');
    if (!('value' in props) && !('defaultValue' in props) && text) props.defaultValue = text;
    return React.createElement(tag, props);
  }
  if (tag === 'select' && !('value' in props) && !('defaultValue' in props)) {
    const sel = children.find((c) => Array.isArray(c) && c[0] === 'option' && 'selected' in c[1]);
    if (sel) props.defaultValue = sel[1].value != null ? value(sel[1].value, scope) : '';
  }
  return React.createElement(tag, props, ...renderNodes(children, scope, ctx));
}

// Builds the React component for one compiled .dc.html file.
// `def` = { tpl, logic(DCLogic, React) }; `ctx.components` holds imports.
export function makeComponent(def, ctx) {
  class DCLogic extends React.Component {
    renderVals() { return {}; }
    render() {
      const vals = this.renderVals() || {};
      return React.createElement(React.Fragment, null, ...renderNodes(def.tpl, [vals], ctx));
    }
  }
  const C = def.logic ? def.logic(DCLogic, React) : null;
  return C || DCLogic;
}
