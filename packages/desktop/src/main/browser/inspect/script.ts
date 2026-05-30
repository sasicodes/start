export const inspectScript: string = String.raw`
(() => {
  if (window.__startInspect__) return;

  const RELAY_PREFIX = '__startInspect__:';
  const ACCENT = '#ff3f00';
  const POPUP_WIDTH = 360;
  const POPUP_GAP = 12;
  const MARKER_SIZE = 22;
  const BADGE_OFFSET = 14;
  const RING_OUTSET = 4;
  const MAX_BREADCRUMB = 5;
  const MAX_HTML = 320;
  const MAX_TEXT = 120;
  const HOVER_THRESHOLD_PX = 2;
  const SKIP_TAGS = new Set([
    'html', 'body',
    'path', 'circle', 'rect', 'g', 'polyline', 'polygon', 'line', 'ellipse',
    'use', 'defs', 'symbol', 'tspan', 'text', 'br', 'wbr'
  ]);
  const INTERACTIVE_TAGS = new Set(['button', 'a', 'input', 'textarea', 'select', 'label', 'summary']);
  const INTERACTIVE_ROLES = new Set(['button', 'link', 'menuitem', 'tab', 'checkbox', 'switch', 'radio']);
  const STYLE_KEYS = [
    'display', 'position', 'flex-direction', 'align-items', 'justify-content',
    'gap', 'width', 'height', 'padding', 'margin',
    'font-family', 'font-size', 'font-weight', 'line-height',
    'color', 'background-color', 'border', 'border-radius', 'box-shadow'
  ];
  const SKIP_STYLE_VALUES = new Set(['none', 'normal', 'auto', 'visible', 'static', 'baseline', 'stretch']);
  const CONTENT_ATTRS = ['alt', 'title', 'aria-label', 'placeholder', 'value'];

  const consoleRef = globalThis.console;
  const relay = (event, payload) => {
    try {
      consoleRef.log(RELAY_PREFIX + JSON.stringify({ event, payload }));
    } catch {}
  };

  const truncate = (text, limit) => (text.length > limit ? text.slice(0, limit) + '…' : text);

  const elementLabel = (el) => {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? '#' + el.id : '';
    const className = typeof el.className === 'string' ? el.className.trim() : '';
    const classes = className ? '.' + className.split(/\s+/).slice(0, 3).join('.') : '';
    return tag + id + classes;
  };

  const elementBreadcrumb = (el) => {
    const parts = [];
    let node = el;
    while (node && node.tagName && node !== document.documentElement && parts.length < MAX_BREADCRUMB) {
      parts.unshift(elementLabel(node));
      node = node.parentElement;
    }
    return parts.join(' > ');
  };

  const elementContent = (el) => {
    const raw = (el.textContent || '').trim().replace(/\s+/g, ' ');
    if (raw) return truncate(raw, MAX_TEXT);
    for (const attr of CONTENT_ATTRS) {
      const value = (el.getAttribute(attr) || '').trim();
      if (value) return truncate(value, MAX_TEXT);
    }
    return '';
  };

  const elementHtml = (el) => {
    const html = el.outerHTML || '';
    if (html.length <= MAX_HTML) return html;
    const openEnd = html.indexOf('>');
    if (openEnd === -1) return html.slice(0, MAX_HTML) + '…';
    return html.slice(0, openEnd + 1) + '…</' + el.tagName.toLowerCase() + '>';
  };

  const elementStyles = (el) => {
    const cs = window.getComputedStyle(el);
    const lines = [];
    for (const key of STYLE_KEYS) {
      const value = cs.getPropertyValue(key);
      if (value && !SKIP_STYLE_VALUES.has(value)) lines.push(key + ': ' + value);
    }
    return lines.join('; ');
  };

  const elementClasses = (el) => {
    if (typeof el.className !== 'string') return '';
    return el.className.trim().replace(/\s+/g, ' ');
  };

  const elementA11y = (el) => {
    const parts = [];
    const role = el.getAttribute('role');
    if (role) parts.push('role=' + role);
    for (const attr of el.attributes) {
      if (attr.name.startsWith('aria-') && attr.value) parts.push(attr.name + '=' + attr.value);
    }
    return parts.join(' ');
  };

  const accessibleName = (el) => {
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const node = document.getElementById(labelledBy);
      if (node?.textContent) return truncate(node.textContent.trim(), 48);
    }
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return truncate(ariaLabel.trim(), 48);
    return truncate(elementContent(el), 48);
  };

  const snapshotElement = (el, x, y) => {
    const rect = el.getBoundingClientRect();
    return {
      x, y,
      label: elementLabel(el),
      breadcrumb: elementBreadcrumb(el),
      content: elementContent(el),
      html: elementHtml(el),
      styles: elementStyles(el),
      classes: elementClasses(el),
      a11y: elementA11y(el),
      box: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
    };
  };

  const isInteractive = (node) => {
    const tag = node.tagName?.toLowerCase();
    if (tag && INTERACTIVE_TAGS.has(tag)) return true;
    const role = node.getAttribute?.('role');
    return Boolean(role && INTERACTIVE_ROLES.has(role));
  };

  const elementBehindHost = (x, y) => {
    const stack = document.elementsFromPoint(x, y);
    let candidate = null;
    let walked = 0;
    for (const node of stack) {
      if (node === host) continue;
      const tag = node.tagName?.toLowerCase();
      if (!tag || SKIP_TAGS.has(tag)) continue;
      if (!candidate) {
        candidate = node;
        continue;
      }
      if (isInteractive(node)) return node;
      walked++;
      if (walked >= 3) break;
    }
    return candidate;
  };

  const positionRing = (box) => {
    ring.style.transform = 'translate(' + (box.x - RING_OUTSET) + 'px,' + (box.y - RING_OUTSET) + 'px)';
    ring.style.width = box.width + RING_OUTSET * 2 + 'px';
    ring.style.height = box.height + RING_OUTSET * 2 + 'px';
  };

  const styles = [
    ':host { all: initial; }',
    '[hidden] { display: none !important; }',
    '* { box-sizing: border-box; margin: 0; padding: 0; }',
    '.overlay { position: fixed; inset: 0; pointer-events: none; cursor: crosshair;',
    '  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }',
    '.overlay.active { pointer-events: auto; }',
    '.ring { position: absolute; top: 0; left: 0; border-radius: 6px;',
    '  border: 1.5px solid ' + ACCENT + '; pointer-events: none; opacity: 0;',
    '  transition: transform 140ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 100ms ease-out;',
    '  will-change: transform, opacity; }',
    '.badge { position: absolute; top: 0; left: 0; pointer-events: none; opacity: 0;',
    '  display: flex; align-items: center; gap: 6px;',
    '  padding: 4px 8px; border-radius: 6px; background: rgba(9,9,11,0.92); color: #fff;',
    '  font-size: 11px; line-height: 1.4; max-width: 320px;',
    '  font-variant-numeric: tabular-nums; box-shadow: 0 2px 8px rgba(0,0,0,0.18);',
    '  transition: transform 80ms ease-out, opacity 100ms ease-out;',
    '  will-change: transform, opacity; }',
    '.badge.visible { opacity: 1; }',
    '.badge-tag { color: ' + ACCENT + '; font-weight: 500; }',
    '.badge-name { opacity: 0.85; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.badge-dim { opacity: 0.6; }',
    '.markers { position: absolute; inset: 0; pointer-events: none; }',
    '.marker { position: absolute; width: ' + MARKER_SIZE + 'px; height: ' + MARKER_SIZE + 'px;',
    '  background: ' + ACCENT + '; color: #fff; border-radius: 50%;',
    '  display: grid; place-items: center;',
    '  font-size: 10px; font-weight: 600; font-variant-numeric: tabular-nums;',
    '  transform: translate(-50%, -50%);',
    '  cursor: pointer; pointer-events: auto;',
    '  box-shadow: 0 1px 3px rgba(0,0,0,0.18); }',
    '.marker.pending { pointer-events: none; }',
    '.popup { position: absolute; width: ' + POPUP_WIDTH + 'px;',
    '  display: flex; flex-direction: column; gap: 14px; padding: 14px;',
    '  border-radius: 12px; background: rgb(24,24,27); color: rgb(244,244,245);',
    '  border: 1px solid rgba(255,255,255,0.06);',
    '  box-shadow: 0 12px 32px rgba(0,0,0,0.32);',
    '  pointer-events: auto; }',
    '.popup-summary { cursor: pointer; background: none; border: 0; color: inherit; padding: 0;',
    '  text-align: left; font: inherit; font-size: 12px;',
    '  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.popup-summary.is-text { font-size: 13px; }',
    '.popup-summary.is-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: rgb(212,212,216); }',
    '.popup-details { display: none; padding: 8px 10px; border-radius: 6px;',
    '  background: rgba(255,255,255,0.04); color: rgb(212,212,216);',
    '  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;',
    '  font-size: 10.5px; line-height: 1.55; overflow-x: auto; white-space: nowrap;',
    '  scrollbar-width: none; }',
    '.popup-details::-webkit-scrollbar { display: none; }',
    '.popup-details.open { display: block; }',
    '.popup-details-key { color: rgb(244,244,245); font-weight: 500; }',
    '.popup-input { width: 100%; resize: none; outline: none;',
    '  padding: 8px 10px; border-radius: 6px;',
    '  background: rgba(255,255,255,0.04); color: rgb(244,244,245);',
    '  border: 1px solid rgba(255,255,255,0.06);',
    '  font: inherit; font-size: 13px; line-height: 1.5; }',
    '.popup-input::placeholder { color: rgb(161,161,170); }',
    '.popup-actions { display: flex; justify-content: flex-end; gap: 6px; }',
    '.popup-btn { width: 24px; height: 24px; display: grid; place-items: center;',
    '  background: none; border: 0; padding: 0; cursor: pointer;',
    '  color: rgb(161,161,170); border-radius: 6px; }',
    '.popup-btn:hover { color: rgb(244,244,245); background: rgba(255,255,255,0.06); }',
    '.popup-btn svg { width: 14px; height: 14px; }',
    '.pill { position: fixed; bottom: 16px; right: 16px;',
    '  display: flex; align-items: center; gap: 2px; padding: 4px 6px 4px 8px;',
    '  border-radius: 9999px; background: rgb(24,24,27); color: rgb(244,244,245);',
    '  border: 1px solid rgba(255,255,255,0.06);',
    '  box-shadow: 0 8px 24px rgba(0,0,0,0.28);',
    '  pointer-events: auto; cursor: grab;',
    '  transition: transform 150ms ease-out, opacity 150ms ease-out; }',
    '.pill.dragging { cursor: grabbing; transition: none; }',
    '.pill-count { width: ' + MARKER_SIZE + 'px; height: ' + MARKER_SIZE + 'px;',
    '  display: grid; place-items: center; margin-right: 4px;',
    '  background: ' + ACCENT + '; color: #fff; border-radius: 50%;',
    '  font-size: 10px; font-weight: 600; font-variant-numeric: tabular-nums;',
    '  line-height: 1; pointer-events: none; }',
    '.pill-btn { width: 30px; height: 30px; border-radius: 9999px;',
    '  display: grid; place-items: center; background: none; border: 0; padding: 0;',
    '  color: rgb(161,161,170); cursor: pointer;',
    '  transition: background 120ms ease-out, color 120ms ease-out; }',
    '.pill-btn:hover { color: rgb(244,244,245); background: rgba(255,255,255,0.06); }',
    '.pill-btn svg { width: 16px; height: 16px; }',
    '.pill-extras { display: flex; align-items: center; gap: 2px; }',
    '.pill-send { width: 30px; height: 30px; margin-left: 4px; border-radius: 9999px;',
    '  display: grid; place-items: center;',
    '  background: rgb(244,244,245); color: rgb(24,24,27); border: 0; padding: 0;',
    '  cursor: pointer; transition: opacity 120ms ease-out; }',
    '.pill-send.disabled { opacity: 0.35; cursor: default; pointer-events: none; }',
    '.pill-send svg { width: 13px; height: 13px; }'
  ].join('\n');

  const svgIcon = (path, width = 16) =>
    '<svg viewBox="0 0 24 24" width="' + width + '" height="' + width +
    '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    path + '</svg>';

  const ICONS = {
    copy: svgIcon(
      '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'
    ),
    trash: svgIcon(
      '<path d="M4.75 6.5L5.65512 19.3901C5.72868 20.4377 6.6 21.25 7.6502 21.25H16.3498C17.4 21.25 18.2713 20.4377 18.3449 19.3901L19.25 6.5"/><path d="M10 10.5V16.25"/><path d="M14 10.5V16.25"/><path d="M3.25 5.75H20.75"/><path d="M8.5246 5.58289C8.73079 3.84652 10.2081 2.5 12 2.5C13.7919 2.5 15.2692 3.84652 15.4754 5.58289"/>'
    ),
    send: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5V20.5"/><path d="M5.5 10L12 3.5L18.5 10"/></svg>',
    check: svgIcon('<path d="M2.75 15.0938L9 20.25L21.25 3.75"/>'),
    close: svgIcon('<path d="M4.75 4.75L19.25 19.25M19.25 4.75L4.75 19.25"/>')
  };

  const create = (tag, className) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  };

  let annotations = [];
  let active = false;
  let pickInfo = null;
  let editingId = null;
  let detailsOpen = false;
  let hoverFrame = null;
  let pendingPointer = null;
  let lastPointerX = Number.NEGATIVE_INFINITY;
  let lastPointerY = Number.NEGATIVE_INFINITY;
  let pillPos = null;
  let pillDrag = null;
  let pillTilt = 0;
  let dragCursorStyle = null;

  const host = document.createElement('div');
  host.id = '__start_inspect__';
  Object.assign(host.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '2147483647'
  });
  const shadow = host.attachShadow({ mode: 'closed' });

  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);

  const overlay = create('div', 'overlay');
  shadow.appendChild(overlay);
  const ring = create('div', 'ring');
  overlay.appendChild(ring);
  const badge = create('div', 'badge');
  overlay.appendChild(badge);
  const markerLayer = create('div', 'markers');
  overlay.appendChild(markerLayer);
  const pendingMarker = create('div', 'marker pending');
  pendingMarker.hidden = true;
  overlay.appendChild(pendingMarker);

  const popupRoot = create('div', 'popup');
  popupRoot.hidden = true;
  const popupSummary = create('button', 'popup-summary');
  popupSummary.type = 'button';
  popupRoot.appendChild(popupSummary);
  const popupDetails = create('div', 'popup-details');
  popupRoot.appendChild(popupDetails);
  const popupInput = create('textarea', 'popup-input');
  popupInput.rows = 2;
  popupInput.placeholder = 'Note about this element';
  popupInput.spellcheck = false;
  popupInput.autocomplete = 'off';
  popupRoot.appendChild(popupInput);
  const popupActions = create('div', 'popup-actions');
  const cancelBtn = create('button', 'popup-btn');
  cancelBtn.type = 'button';
  cancelBtn.innerHTML = ICONS.close;
  const confirmBtn = create('button', 'popup-btn');
  confirmBtn.type = 'button';
  confirmBtn.title = 'Save (Enter)';
  confirmBtn.innerHTML = ICONS.check;
  popupActions.appendChild(cancelBtn);
  popupActions.appendChild(confirmBtn);
  popupRoot.appendChild(popupActions);
  overlay.appendChild(popupRoot);

  const pillRoot = create('div', 'pill');
  pillRoot.hidden = true;
  const pillCount = create('div', 'pill-count');
  const pillExtras = create('div', 'pill-extras');
  const pillCopyBtn = create('button', 'pill-btn');
  pillCopyBtn.type = 'button';
  pillCopyBtn.title = 'Copy all annotations';
  pillCopyBtn.innerHTML = ICONS.copy;
  const pillClearBtn = create('button', 'pill-btn');
  pillClearBtn.type = 'button';
  pillClearBtn.title = 'Clear all annotations';
  pillClearBtn.innerHTML = ICONS.trash;
  const pillSendBtn = create('button', 'pill-send');
  pillSendBtn.type = 'button';
  pillSendBtn.title = 'Send to chat';
  pillSendBtn.innerHTML = ICONS.send;
  pillExtras.appendChild(pillCopyBtn);
  pillExtras.appendChild(pillClearBtn);
  pillExtras.appendChild(pillSendBtn);
  pillRoot.appendChild(pillCount);
  pillRoot.appendChild(pillExtras);
  shadow.appendChild(pillRoot);

  const clampPopupPosition = (x, y) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const popupHeight = popupRoot.offsetHeight || 160;
    let left = x + POPUP_GAP;
    let top = y + POPUP_GAP;
    if (left + POPUP_WIDTH > vw - POPUP_GAP) left = Math.max(POPUP_GAP, x - POPUP_WIDTH - POPUP_GAP);
    if (top + popupHeight > vh - POPUP_GAP) top = Math.max(POPUP_GAP, y - popupHeight - POPUP_GAP);
    return { left, top };
  };

  const renderBadge = (el) => {
    const rect = el.getBoundingClientRect();
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute('role');
    const name = accessibleName(el);
    const dim = Math.round(rect.width) + ' × ' + Math.round(rect.height);
    const tagSpan = create('span', 'badge-tag');
    tagSpan.textContent = tag + (role ? '[role=' + role + ']' : '');
    badge.replaceChildren(tagSpan);
    if (name) {
      const nameSpan = create('span', 'badge-name');
      nameSpan.textContent = name;
      badge.appendChild(nameSpan);
    }
    const dimSpan = create('span', 'badge-dim');
    dimSpan.textContent = dim;
    badge.appendChild(dimSpan);
  };

  const positionBadge = (x, y) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = badge.offsetWidth || 0;
    const height = badge.offsetHeight || 0;
    let left = x + BADGE_OFFSET;
    let top = y + BADGE_OFFSET;
    if (left + width > vw - 4) left = x - width - BADGE_OFFSET;
    if (top + height > vh - 4) top = y - height - BADGE_OFFSET;
    badge.style.transform = 'translate(' + Math.max(4, left) + 'px,' + Math.max(4, top) + 'px)';
  };

  const flushHover = () => {
    hoverFrame = null;
    if (!pendingPointer || pickInfo) return;
    const pointer = pendingPointer;
    pendingPointer = null;
    if (Math.abs(pointer.x - lastPointerX) < HOVER_THRESHOLD_PX && Math.abs(pointer.y - lastPointerY) < HOVER_THRESHOLD_PX) return;
    lastPointerX = pointer.x;
    lastPointerY = pointer.y;
    const el = elementBehindHost(pointer.x, pointer.y);
    if (!el) {
      ring.style.opacity = '0';
      badge.classList.remove('visible');
      return;
    }
    const rect = el.getBoundingClientRect();
    positionRing({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
    ring.style.opacity = '1';
    renderBadge(el);
    positionBadge(pointer.x, pointer.y);
    badge.classList.add('visible');
  };

  const handleOverlayMove = (event) => {
    if (pillDrag) return;
    pendingPointer = { x: event.clientX, y: event.clientY };
    if (hoverFrame === null) hoverFrame = requestAnimationFrame(flushHover);
  };

  const handleOverlayLeave = () => {
    pendingPointer = null;
    ring.style.opacity = '0';
    badge.classList.remove('visible');
  };

  const renderMarkers = () => {
    markerLayer.replaceChildren();
    annotations.forEach((annotation, index) => {
      if (annotation.x == null || annotation.y == null) return;
      const marker = create('div', 'marker');
      marker.style.transform = 'translate(' + annotation.x + 'px,' + annotation.y + 'px) translate(-50%,-50%)';
      marker.textContent = String(index + 1);
      marker.dataset.id = annotation.id;
      markerLayer.appendChild(marker);
    });
  };

  const renderPendingMarker = () => {
    if (!pickInfo || editingId) {
      pendingMarker.hidden = true;
      return;
    }
    pendingMarker.hidden = false;
    pendingMarker.textContent = String(annotations.length + 1);
    pendingMarker.style.transform = 'translate(' + pickInfo.x + 'px,' + pickInfo.y + 'px) translate(-50%,-50%)';
  };

  const renderDetails = () => {
    if (!pickInfo) return;
    popupDetails.replaceChildren();
    const rows = [
      { key: 'element', value: pickInfo.label },
      { key: 'path', value: pickInfo.breadcrumb || pickInfo.label },
      { key: 'viewport', value: window.innerWidth + ' × ' + window.innerHeight }
    ];
    if (pickInfo.a11y) rows.push({ key: 'a11y', value: pickInfo.a11y });
    if (pickInfo.styles) rows.push({ key: 'styles', value: pickInfo.styles });
    for (const row of rows) {
      const line = document.createElement('div');
      const keySpan = create('span', 'popup-details-key');
      keySpan.textContent = row.key;
      line.appendChild(keySpan);
      line.appendChild(document.createTextNode(': ' + row.value));
      popupDetails.appendChild(line);
    }
  };

  const renderPopup = () => {
    if (!pickInfo) return;
    const placement = clampPopupPosition(pickInfo.x, pickInfo.y);
    popupRoot.hidden = false;
    popupRoot.style.left = placement.left + 'px';
    popupRoot.style.top = placement.top + 'px';
    popupSummary.textContent = pickInfo.content || pickInfo.label;
    popupSummary.className = 'popup-summary ' + (pickInfo.content ? 'is-text' : 'is-code');
    popupDetails.className = detailsOpen ? 'popup-details open' : 'popup-details';
    renderDetails();
    const existing = editingId ? annotations.find((a) => a.id === editingId) : null;
    popupInput.value = existing?.comment ?? '';
    cancelBtn.title = editingId ? 'Delete annotation' : 'Discard';
    setTimeout(() => popupInput.focus({ preventScroll: true }), 0);
  };

  const renderPill = () => {
    if (annotations.length === 0) {
      pillRoot.hidden = true;
      return;
    }
    pillRoot.hidden = false;
    pillCount.textContent = String(annotations.length);
    if (pillPos) {
      pillRoot.style.left = pillPos.left + 'px';
      pillRoot.style.top = pillPos.top + 'px';
      pillRoot.style.right = 'auto';
      pillRoot.style.bottom = 'auto';
    }
  };

  const dismissPopup = () => {
    pickInfo = null;
    editingId = null;
    detailsOpen = false;
    popupRoot.hidden = true;
    pendingMarker.hidden = true;
    ring.style.opacity = '0';
  };

  const confirmPick = () => {
    if (!pickInfo) return;
    const comment = popupInput.value.trim();
    if (!comment) return;
    if (editingId) {
      const target = annotations.find((entry) => entry.id === editingId);
      if (target) target.comment = comment;
    } else {
      annotations.push({
        id: Date.now().toString(36) + '-' + annotations.length,
        comment,
        ...pickInfo,
        timestamp: Date.now(),
        url: window.location.href
      });
    }
    relay('annotation-saved', { id: editingId ?? annotations.at(-1)?.id, count: annotations.length });
    dismissPopup();
    renderMarkers();
    renderPill();
  };

  const handleOverlayClick = (event) => {
    const path = event.composedPath();
    const target = path[0];
    if (popupRoot.contains(target)) return;
    const markerEl = path.find((node) => node instanceof Element && node.classList?.contains('marker'));
    if (markerEl && markerEl !== pendingMarker) {
      event.stopPropagation();
      const id = markerEl.dataset.id;
      const annotation = annotations.find((entry) => entry.id === id);
      if (!annotation) return;
      editingId = id;
      detailsOpen = false;
      pickInfo = annotation;
      positionRing(annotation.box);
      ring.style.opacity = '1';
      renderPopup();
      return;
    }
    if (pickInfo) {
      dismissPopup();
      return;
    }
    const x = event.clientX;
    const y = event.clientY;
    const el = elementBehindHost(x, y);
    if (!el) return;
    pickInfo = snapshotElement(el, x, y);
    editingId = null;
    detailsOpen = false;
    positionRing(pickInfo.box);
    ring.style.opacity = '1';
    badge.classList.remove('visible');
    renderPopup();
    renderPendingMarker();
    relay('annotation-pending', { x, y, label: pickInfo.label });
  };

  const formatAnnotations = () => {
    const lines = [];
    const scheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    lines.push('<viewport>' + window.innerWidth + ' × ' + window.innerHeight + ' · ' + scheme + '</viewport>');
    lines.push('<url>' + window.location.href + '</url>');
    annotations.forEach((entry, index) => {
      const attrs = ['index="' + (index + 1) + '"', 'element="' + (entry.label || 'element') + '"'];
      if (entry.breadcrumb) attrs.push('path="' + entry.breadcrumb + '"');
      lines.push('');
      lines.push('<annotation ' + attrs.join(' ') + '>');
      if (entry.html) lines.push('<html>\n' + entry.html + '\n</html>');
      if (entry.styles) lines.push('<styles>\n' + entry.styles + '\n</styles>');
      if (entry.classes) lines.push('<classes>' + entry.classes + '</classes>');
      if (entry.a11y) lines.push('<accessibility>' + entry.a11y + '</accessibility>');
      if (entry.content) lines.push('<nearby-text>' + entry.content + '</nearby-text>');
      if (entry.box)
        lines.push(
          '<bounding-box x="' + Math.round(entry.box.x) +
          '" y="' + Math.round(entry.box.y) +
          '" width="' + Math.round(entry.box.width) +
          '" height="' + Math.round(entry.box.height) + '" />'
        );
      if (entry.comment) lines.push('<comment>' + entry.comment + '</comment>');
      lines.push('</annotation>');
    });
    return lines.join('\n');
  };

  const sendAnnotations = () => {
    if (annotations.length === 0) return;
    const formatted = formatAnnotations();
    relay('annotations-sent', { count: annotations.length, text: formatted });
    annotations = [];
    renderMarkers();
    renderPill();
    if (!active) teardownHost();
  };

  const copyAnnotations = () => {
    if (annotations.length === 0) return;
    const text = formatAnnotations();
    navigator.clipboard?.writeText(text).catch(() => {});
    relay('annotations-copied', { count: annotations.length });
  };

  const clearAnnotations = () => {
    annotations = [];
    renderMarkers();
    renderPill();
    if (!active) teardownHost();
    relay('annotations-cleared', {});
  };

  const onKeyDown = (event) => {
    if (event.key !== 'Escape') return;
    if (pickInfo) {
      event.preventDefault();
      dismissPopup();
      return;
    }
    if (active) {
      event.preventDefault();
      deactivate();
    }
  };

  const activate = () => {
    if (active) return;
    active = true;
    overlay.classList.add('active');
    if (!host.parentNode) document.body.appendChild(host);
    window.addEventListener('keydown', onKeyDown);
    renderMarkers();
    renderPill();
    relay('mode-changed', { active: true });
  };

  const teardownHost = () => {
    if (host.parentNode) host.parentNode.removeChild(host);
    pillPos = null;
  };

  const deactivate = () => {
    if (!active) {
      if (annotations.length === 0) teardownHost();
      relay('mode-changed', { active: false });
      return;
    }
    active = false;
    overlay.classList.remove('active');
    if (hoverFrame !== null) {
      cancelAnimationFrame(hoverFrame);
      hoverFrame = null;
    }
    pendingPointer = null;
    dismissPopup();
    badge.classList.remove('visible');
    ring.style.opacity = '0';
    renderPill();
    window.removeEventListener('keydown', onKeyDown);
    if (annotations.length === 0) teardownHost();
    relay('mode-changed', { active: false });
  };

  const clampPillPos = () => {
    const padding = 8;
    const width = pillRoot.offsetWidth || 160;
    const height = pillRoot.offsetHeight || 38;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    pillPos.left = Math.min(Math.max(padding, pillPos.left), vw - width - padding);
    pillPos.top = Math.min(Math.max(padding, pillPos.top), vh - height - padding);
  };

  const handlePillPointerDown = (event) => {
    let node = event.target;
    while (node && node !== pillRoot) {
      if (node.tagName === 'BUTTON') return;
      node = node.parentNode;
    }
    event.preventDefault();
    const rect = pillRoot.getBoundingClientRect();
    if (!pillPos) pillPos = { left: rect.left, top: rect.top };
    pillDrag = {
      startX: event.clientX,
      startY: event.clientY,
      originLeft: pillPos.left,
      originTop: pillPos.top,
      prevX: event.clientX
    };
    pillRoot.classList.add('dragging');
    pendingPointer = null;
    if (hoverFrame !== null) {
      cancelAnimationFrame(hoverFrame);
      hoverFrame = null;
    }
    ring.style.opacity = '0';
    badge.classList.remove('visible');
    if (!dragCursorStyle) {
      dragCursorStyle = document.createElement('style');
      dragCursorStyle.textContent = '* { cursor: grabbing !important; }';
    }
    document.head.appendChild(dragCursorStyle);
    document.addEventListener('mousemove', handleDocumentPointerMove);
    document.addEventListener('mouseup', handleDocumentPointerUp);
  };

  const handleDocumentPointerMove = (event) => {
    if (!pillDrag) return;
    const instantDx = event.clientX - pillDrag.prevX;
    pillDrag.prevX = event.clientX;
    pillPos = {
      left: pillDrag.originLeft + (event.clientX - pillDrag.startX),
      top: pillDrag.originTop + (event.clientY - pillDrag.startY)
    };
    clampPillPos();
    const targetTilt = Math.max(-14, Math.min(14, instantDx * 2));
    pillTilt += (targetTilt - pillTilt) * 0.18;
    pillRoot.style.left = pillPos.left + 'px';
    pillRoot.style.top = pillPos.top + 'px';
    pillRoot.style.right = 'auto';
    pillRoot.style.bottom = 'auto';
    pillRoot.style.transform = 'rotate(' + pillTilt.toFixed(2) + 'deg)';
  };

  const handleDocumentPointerUp = () => {
    if (!pillDrag) return;
    pillDrag = null;
    pillTilt = 0;
    pillRoot.classList.remove('dragging');
    pillRoot.style.transform = 'rotate(0deg)';
    if (dragCursorStyle?.parentNode) dragCursorStyle.parentNode.removeChild(dragCursorStyle);
    document.removeEventListener('mousemove', handleDocumentPointerMove);
    document.removeEventListener('mouseup', handleDocumentPointerUp);
  };

  overlay.addEventListener('mousemove', handleOverlayMove);
  overlay.addEventListener('mouseleave', handleOverlayLeave);
  overlay.addEventListener('click', handleOverlayClick);

  popupSummary.addEventListener('click', (event) => {
    event.stopPropagation();
    detailsOpen = !detailsOpen;
    popupDetails.className = detailsOpen ? 'popup-details open' : 'popup-details';
  });
  cancelBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (editingId) {
      const removedId = editingId;
      annotations = annotations.filter((entry) => entry.id !== removedId);
      relay('annotation-deleted', { id: removedId });
      dismissPopup();
      renderMarkers();
      renderPill();
      if (annotations.length === 0 && !active) teardownHost();
      return;
    }
    dismissPopup();
  });
  confirmBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    confirmPick();
  });
  popupRoot.addEventListener('click', (event) => event.stopPropagation());
  popupInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      confirmPick();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      dismissPopup();
    }
  });

  pillCopyBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    copyAnnotations();
  });
  pillClearBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    clearAnnotations();
  });
  pillSendBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    sendAnnotations();
  });
  pillRoot.addEventListener('mousedown', handlePillPointerDown);

  if (!host.parentNode) document.body.appendChild(host);
  renderMarkers();
  renderPill();
  activate();

  window.__startInspect__ = {
    activate,
    deactivate,
    isActive: () => active
  };
})();
`;
