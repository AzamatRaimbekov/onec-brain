// Brain map SVG: cortex, zone glows, neurons, labels, zoom into the selected zone and a hover tooltip.
// Exposes window.BrainMap = { ZONES, SPECIAL, Brain, zoneColor }.
(function () {
  const h = React.createElement;
  const { useMemo, useState, useEffect, useRef } = React;
  const G = window.BrainGeo;
  const { ZONES, SPECIAL, CORE, VIEW } = G;
  const zoneColor = (z) => `var(--l-${z})`;
  const curve = (a, b, bend) => `M${a[0]} ${a[1]} Q${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2 - bend} ${b[0]} ${b[1]}`;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fits a box into the 1000×740 frame, keeping the aspect ratio.
  function frame(box, pad) {
    let [x0, y0, x1, y1] = [box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad];
    const ratio = VIEW[2] / VIEW[3];
    let w = Math.max(x1 - x0, 520), hh = Math.max(y1 - y0, 520 / ratio);
    if (w / hh > ratio) hh = w / ratio; else w = hh * ratio;
    return [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - hh / 2, w, hh];
  }
  function useTween(target) {
    const [vb, setVb] = useState(target);
    const cur = useRef(target);
    useEffect(() => {
      const from = cur.current, t0 = performance.now(), dur = reduced() ? 0 : 520;
      let id;
      const step = (t) => {
        const k = dur ? Math.min(1, (t - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 3);
        cur.current = from.map((v, i) => v + (target[i] - v) * e);
        setVb(cur.current);
        if (k < 1) id = requestAnimationFrame(step);
      };
      id = requestAnimationFrame(step);
      return () => cancelAnimationFrame(id);
    }, [target.join(',')]);
    return vb;
  }

  function Defs({ zones }) {
    return h('defs', null,
      h('clipPath', { id: 'clip-brain' }, h('path', { d: G.CEREBRUM })),
      h('clipPath', { id: 'clip-little' }, h('path', { d: G.CEREBELLUM })),
      h('radialGradient', { id: 'g-cortex', cx: '42%', cy: '38%', r: '70%' },
        h('stop', { offset: '0%', style: { stopColor: 'var(--cortex-hi)' } }), h('stop', { offset: '100%', style: { stopColor: 'var(--cortex)' } })),
      Object.keys(zones).map((z) => h('radialGradient', { key: z, id: 'glow-' + z },
        h('stop', { offset: '0%', style: { stopColor: zoneColor(z), stopOpacity: 0.34 } }),
        h('stop', { offset: '100%', style: { stopColor: zoneColor(z), stopOpacity: 0 } }))),
      h('filter', { id: 'f-glow', x: '-50%', y: '-50%', width: '200%', height: '200%' },
        h('feGaussianBlur', { stdDeviation: 2.4, result: 'b' }),
        h('feMerge', null, h('feMergeNode', { in: 'b' }), h('feMergeNode', { in: 'SourceGraphic' }))));
  }

  function Brain({ nodes, sel, setSel, hover, setHover, match }) {
    const { pos, edges, zones } = useMemo(() => G.layout(nodes), [nodes]);
    const activeZone = sel && sel.type === 'zone' ? sel.id : sel && sel.type === 'node' ? nodes[sel.id].zone : null;
    const target = activeZone && zones[activeZone] ? frame(zones[activeZone].box, 80) : VIEW;
    const vb = useTween(target);
    const off = (z) => (match ? false : activeZone && z !== activeZone);
    const dim = (i) => (match ? !match.has(i) : activeZone && nodes[i].zone !== activeZone);
    const k = vb[2] / VIEW[2];
    const path = (props) => h('path', { fill: 'none', ...props });
    const tip = hover != null && nodes[hover];

    return h('div', { className: 'brain' },
      h('svg', { viewBox: vb.map((v) => v.toFixed(1)).join(' '), role: 'img', 'aria-label': 'Карта мозга 1С по зонам', onMouseLeave: () => setHover(null) },
        h(Defs, { zones }),
        h('g', { className: 'anatomy' },
          path({ d: G.STEM, fill: 'var(--cortex)', stroke: 'var(--skull)', strokeWidth: 2 }),
          path({ d: G.CEREBELLUM, fill: 'var(--cortex)', stroke: 'var(--skull)', strokeWidth: 2 }),
          h('g', { clipPath: 'url(#clip-little)' }, G.FOLIA.map((d, i) => path({ key: i, d, stroke: 'var(--gyri)', strokeWidth: 1.6 }))),
          path({ d: G.CEREBRUM, fill: 'url(#g-cortex)', stroke: 'var(--skull)', strokeWidth: 2.5 }),
          h('g', { clipPath: 'url(#clip-brain)' },
            G.FOLDS.map((d, i) => path({ key: i, d, stroke: 'var(--gyri)', strokeWidth: 2.2, strokeLinecap: 'round' })),
            Object.entries(zones).map(([z, Z]) => h('circle', { key: z, cx: Z.c[0], cy: Z.c[1], r: Z.r * 1.15, fill: `url(#glow-${z})`, opacity: off(z) ? 0.25 : 1, className: 'fade' }))),
          G.SULCI.map((d, i) => path({ key: i, d, stroke: 'var(--skull)', strokeWidth: 2.4, strokeLinecap: 'round' }))),
        Object.entries(zones).map(([z, Z]) => z !== 'bsp' && path({ key: 'hub' + z, d: curve(Z.c, CORE, 36), stroke: zoneColor(z), strokeWidth: 1.6 * k,
          opacity: off(z) ? 0.08 : 0.6, className: 'pulse fade' })),
        Object.entries(SPECIAL).map(([id, S]) => path({ key: 'sp' + id, d: curve(S.at, CORE, -40), stroke: 'var(--muted)', strokeWidth: k, strokeDasharray: `${3 * k} ${5 * k}`, opacity: activeZone ? 0.12 : 0.45, className: 'fade' })),
        h('g', { className: 'edges' }, edges.map(([a, b], i) => h('line', { key: i, x1: pos[a][0], y1: pos[a][1], x2: pos[b][0], y2: pos[b][1],
          stroke: zoneColor(nodes[a].zone), strokeWidth: 0.9, opacity: dim(a) ? 0.06 : 0.38 }))),
        h('g', { className: 'neurons' }, nodes.map((n, i) => {
          const on = (sel && sel.type === 'node' && sel.id === i) || hover === i, big = n.kind === 'bsp';
          return h('circle', { key: i, className: 'neuron', cx: pos[i][0], cy: pos[i][1], r: on ? 7.5 : big ? 5 : 4.2,
            fill: big ? 'var(--cortex)' : zoneColor(n.zone), stroke: on ? 'var(--ink)' : big ? zoneColor(n.zone) : 'transparent',
            strokeWidth: on ? 2.5 : big ? 2.2 : 8, opacity: dim(i) ? 0.13 : 1,
            onMouseEnter: () => setHover(i), onClick: () => setSel({ type: 'node', id: i }) });
        })),
        h('g', { className: 'core', onClick: () => setSel(null) },
          h('circle', { cx: CORE[0], cy: CORE[1], r: 30, className: 'core-ring' }),
          h('circle', { cx: CORE[0], cy: CORE[1], r: 21, fill: 'var(--ink)' }),
          h('text', { x: CORE[0], y: CORE[1] + 4, textAnchor: 'middle', fill: 'var(--surface)', className: 'core-text' }, 'core')),
        Object.keys(ZONES).map((z) => {
          const b = G.labelBox(z);
          return h('g', { key: 'l' + z, className: 'lobe fade', opacity: off(z) ? 0.35 : 1, onClick: () => setSel({ type: 'zone', id: z }) },
            h('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 14, fill: 'var(--surface)', stroke: zoneColor(z), strokeWidth: 1.5, fillOpacity: 0.92 }),
            h('circle', { cx: b.x + 13, cy: b.y + 14, r: 4, fill: zoneColor(z) }),
            h('text', { x: b.x + 22, y: b.y + 18.5, className: 'lobe-label' }, ZONES[z].name));
        }),
        Object.entries(SPECIAL).map(([id, S]) => h('g', { key: 'g' + id, className: 'special', onClick: () => setSel({ type: 'special', id }) },
          h('rect', { x: S.at[0] - 8, y: S.at[1] - 8, width: 16, height: 16, rx: 4, fill: 'var(--surface)', stroke: 'var(--ink)', strokeWidth: 2 }),
          h('text', { x: S.side ? S.at[0] + 16 : S.at[0], y: S.side ? S.at[1] + 4 : S.at[1] + 25, textAnchor: S.side ? 'start' : 'middle', className: 'small-label' }, S.name)))),
      tip && h('div', { className: 'tip', style: { left: `${(pos[hover][0] - vb[0]) / vb[2] * 100}%`, top: `${(pos[hover][1] - vb[1]) / vb[3] * 100}%` } },
        h('span', { className: 'tip-code', style: { color: zoneColor(tip.zone) } }, tip.kind === 'bsp' ? 'БСП · ' + tip.name : tip.id),
        h('span', null, tip.kind === 'bsp' ? tip.purpose : tip.title)),
      activeZone && h('button', { className: 'zoom-out', onClick: () => setSel(null) }, '← Весь мозг'));
  }

  window.BrainMap = { ZONES, SPECIAL, Brain, zoneColor };
})();
