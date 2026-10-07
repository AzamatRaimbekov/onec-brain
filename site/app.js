// «Мозг 1С» site: tabs, inspector panel and the real plugin texts loaded from ../plugins/onec-pack.
(function () {
  const h = React.createElement;
  const { useState, useMemo, useEffect } = React;
  const { ZONES, SPECIAL, Brain, zoneColor } = window.BrainMap;
  const PLUGIN = '../plugins/onec-pack/';
  const REPO = 'https://github.com/AzamatRaimbekov/onec-brain';
  const itsUrl = (id) => `https://its.1c.ru/db/v8std/content/${id}/hdoc`;

  // ---------- markdown loading ----------
  const cache = new Map();
  function fetchText(path) {
    if (!cache.has(path)) cache.set(path, fetch(PLUGIN + path).then((r) => { if (!r.ok) throw new Error(`${r.status} ${path}`); return r.text(); }));
    return cache.get(path);
  }
  const stripFrontmatter = (t) => t.replace(/^---\n[\s\S]*?\n---\n/, '');
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Text from a heading matching `re` up to the next heading of the same or higher level.
  function section(text, re, level) {
    const lines = text.split('\n'), start = lines.findIndex((l) => re.test(l));
    if (start < 0) return null;
    const stop = new RegExp(`^#{1,${level}} `);
    let end = start + 1;
    while (end < lines.length && !stop.test(lines[end])) end++;
    return lines.slice(start, end).join('\n');
  }
  function useText(loader, deps) {
    const [state, setState] = useState({ loading: true });
    useEffect(() => {
      let alive = true;
      setState({ loading: true });
      loader().then((text) => alive && setState({ text }), (e) => alive && setState({ error: String(e.message || e) }));
      return () => { alive = false; };
    }, deps);
    return state;
  }
  function Markdown({ state, empty }) {
    if (state.loading) return h('p', { className: 'hint' }, 'Загружаю текст из плагина…');
    if (state.error) return h('p', { className: 'hint' }, 'Не удалось загрузить: ', state.error, '. Запустите сайт через npm run site.');
    if (!state.text) return h('p', { className: 'hint' }, empty || 'Раздел не найден.');
    return h('div', { className: 'md', dangerouslySetInnerHTML: { __html: DOMPurify.sanitize(marked.parse(state.text)) } });
  }

  // ---------- panel ----------
  function NodeList({ ids, nodes, setSel }) {
    return h('ul', { className: 'list' }, ids.slice(0, 400).map((i) => h('li', { key: i },
      h('button', { onClick: () => setSel({ type: 'node', id: i }) },
        h('span', { className: 'n' }, nodes[i].kind === 'bsp' ? 'БСП' : nodes[i].id),
        h('span', null, nodes[i].kind === 'bsp' ? `${nodes[i].name} — ${nodes[i].purpose}` : nodes[i].title)))));
  }
  function StdDetail({ n }) {
    const state = useText(() => fetchText(`skills/onec-v8std/references/${n.file}.md`)
      .then((t) => section(t, new RegExp(`^### ${n.id}(?![0-9])`), 3)), [n.id]);
    return [
      h('div', { key: 'c', className: 'chips' }, h('span', { className: 'chip' }, h('span', { className: 'dot', style: { background: zoneColor(n.zone) } }), n.id),
        h('span', { className: 'chip' }, ZONES[n.zone].name)),
      h('a', { key: 'a', className: 'link', href: itsUrl(n.its), target: '_blank', rel: 'noopener' }, 'Первоисточник на its.1c.ru →'),
      h('div', { key: 'e', className: 'eyebrow' }, `Конспект · skills/onec-v8std/references/${n.file}.md`),
      h(Markdown, { key: 'm', state }),
    ];
  }
  function ApiMethods({ name }) {
    const [open, setOpen] = useState(null);
    const list = useText(() => fetchText('skills/onec-bsp/references/api-index.md').then((t) =>
      t.split('\n').filter((l) => l.includes(`api/${name}.md`) || l.includes(`api/${name}.`)).join('\n')), [name]);
    const methods = (list.text || '').split('\n').filter(Boolean).map((l) => {
      const m = l.match(/^- `([^(`]+)\(/), f = l.match(/(api\/\S+\.md)\s*$/);
      return m && f ? { full: m[1], file: f[1], line: l } : null;
    }).filter(Boolean);
    return h('div', null,
      h('div', { className: 'eyebrow' }, `Методы API (${methods.length})`),
      list.loading ? h('p', { className: 'hint' }, 'Загружаю…') : h('ul', { className: 'list' }, methods.map((m) => h('li', { key: m.full },
        h('button', { onClick: () => setOpen(open === m.full ? null : m.full), 'aria-expanded': open === m.full },
          h('span', { className: 'n' }, open === m.full ? '▾' : '▸'), h('span', { className: 'mono' }, m.full)),
        open === m.full && h(ApiMethod, { m })))));
  }
  function ApiMethod({ m }) {
    const state = useText(() => fetchText(`skills/onec-bsp/references/${m.file}`).then((t) => section(t, new RegExp(`^### ${esc(m.full)}$`), 3)), [m.full]);
    return h('div', { style: { padding: '0 4px 10px' } }, h(Markdown, { state }));
  }
  function BspDetail({ n }) {
    const state = useText(() => fetchText(`skills/onec-bsp/references/${n.recipe}.md`)
      .then((t) => section(t, new RegExp(`^## (\\d+\\.\\s*)?${esc(n.name)}(?![\\wА-Яа-яЁё])`), 2)), [n.name]);
    return [
      h('div', { key: 'c', className: 'chips' }, h('span', { className: 'chip' }, h('span', { className: 'dot', style: { background: zoneColor('bsp') } }), `${n.methods} методов`),
        h('span', { className: 'chip' }, n.group)),
      h('div', { key: 'e', className: 'eyebrow' }, `Рецепт встраивания · skills/onec-bsp/references/${n.recipe}.md`),
      h(Markdown, { key: 'm', state, empty: 'Отдельного раздела нет, подсистема описана в общем тексте рецепта.' }),
      h(ApiMethods, { key: 'a', name: n.name }),
    ];
  }
  function FileDetail({ path, about }) {
    const state = useText(() => (path ? fetch('../' + path).then((r) => r.text()).then((t) => path.endsWith('.md') ? stripFrontmatter(t) : '```js\n' + t + '\n```') : Promise.resolve('')), [path]);
    return [about && h('p', { key: 'p' }, about), path && h('div', { key: 'e', className: 'eyebrow' }, path), path && h(Markdown, { key: 'm', state })];
  }

  function Panel({ data, nodes, sel, setSel, q, setQ, results }) {
    const count = (z) => nodes.filter((n) => n.zone === z).length;
    const back = (label, to) => h('button', { key: 'back', className: 'back', onClick: () => setSel(to) }, '← ' + label);
    let body;
    if (q.trim()) {
      body = [h('div', { key: 'h', className: 'eyebrow' }, `Найдено: ${results.length}`), h(NodeList, { key: 'l', ids: results, nodes, setSel })];
    } else if (!sel) {
      body = [
        h('div', { key: 'e', className: 'eyebrow' }, `Плагин ${data.plugin.name} · v${data.plugin.version}`),
        h('h2', { key: 'h' }, 'Как устроен мозг'),
        h('p', { key: 'p' }, 'Каждая точка — стандарт из its.1c.ru/db/v8std или подсистема БСП. В центре, вокруг onec-core, лежит БСП: на ней стоят остальные зоны. Нажмите на точку или зону: справа откроется настоящий текст, по которому работает Claude.'),
        h('div', { key: 'lg', className: 'legend' }, Object.entries(ZONES).map(([id, Z]) => h('button', { key: id, onClick: () => setSel({ type: 'zone', id }) },
          h('span', { className: 'dot', style: { background: zoneColor(id) } }), Z.name, h('span', { className: 'c' }, count(id))))),
        h('div', { key: 'sp', className: 'legend' }, Object.entries(SPECIAL).map(([id, S]) => h('button', { key: id, onClick: () => setSel({ type: 'special', id }) },
          h('span', { className: 'dot', style: { background: 'var(--hub)', borderRadius: 2 } }), S.name))),
      ];
    } else if (sel.type === 'zone') {
      const Z = ZONES[sel.id], ids = nodes.map((n, i) => i).filter((i) => nodes[i].zone === sel.id);
      body = [back('Весь мозг', null),
        h('div', { key: 'e', className: 'eyebrow' }, `${Z.anat} · ${ids.length} ${sel.id === 'bsp' ? 'подсистем' : 'стандартов'}`),
        h('h2', { key: 'h', style: { color: zoneColor(sel.id) } }, Z.name), h('p', { key: 'p' }, Z.about),
        h('span', { key: 'c', className: 'chip' }, 'скилл ', Z.skill),
        h('div', { key: 'r0', className: 'eyebrow' }, 'Главные правила'),
        h('ol', { key: 'r', className: 'rules' }, Z.rules.map((t, k) => h('li', { key: k }, t))),
        h('div', { key: 'l0', className: 'eyebrow' }, 'Всё в зоне'), h(NodeList, { key: 'l', ids, nodes, setSel })];
    } else if (sel.type === 'special') {
      const S = SPECIAL[sel.id];
      body = [back('Весь мозг', null), h('div', { key: 'e', className: 'eyebrow' }, S.kind), h('h2', { key: 'h' }, S.name),
        h(FileDetail, { key: 'f', path: S.path, about: S.about })];
    } else {
      const n = nodes[sel.id];
      body = [back(ZONES[n.zone].name, { type: 'zone', id: n.zone }),
        h('div', { key: 'e', className: 'eyebrow' }, n.kind === 'bsp' ? 'подсистема БСП · ' + n.group : n.section),
        h('h2', { key: 'h' }, n.kind === 'bsp' ? n.name : n.title),
        n.kind === 'bsp' && h('p', { key: 'p' }, n.purpose),
        h(n.kind === 'bsp' ? BspDetail : StdDetail, { key: 'd' + sel.id, n })];
    }
    return h('aside', { className: 'card panel' },
      h('label', { htmlFor: 'q', className: 'eyebrow' }, 'Поиск по стандартам и БСП'),
      h('input', { id: 'q', className: 'search', type: 'search', placeholder: 'печать, транзакция, std652…', value: q, onChange: (e) => setQ(e.target.value) }),
      ...body);
  }

  function BrainTab({ data, nodes }) {
    const [sel, setSel] = useState(null);
    const [hover, setHover] = useState(null);
    const [q, setQ] = useState('');
    const results = useMemo(() => {
      const t = q.trim().toLowerCase(); if (!t) return [];
      return nodes.map((n, i) => i).filter((i) => [nodes[i].id, nodes[i].title, nodes[i].section, nodes[i].name, nodes[i].purpose].join(' ').toLowerCase().includes(t));
    }, [q, nodes]);
    const match = q.trim() ? new Set(results) : null;
    const shown = hover != null ? hover : sel && sel.type === 'node' ? sel.id : null;
    const n = shown != null ? nodes[shown] : null;
    return h('div', { className: 'grid' },
      h('section', { className: 'card stage' }, h(Brain, { nodes, sel, setSel, hover, setHover, match }),
        h('div', { className: 'caption', 'aria-live': 'polite' }, n
          ? [h('span', { key: 'c', className: 'code', style: { color: zoneColor(n.zone) } }, n.kind === 'bsp' ? 'БСП · ' + n.name : n.id), h('span', { key: 't' }, n.kind === 'bsp' ? n.purpose : n.title)]
          : h('span', { className: 'hint' }, 'Наведите на точку, чтобы увидеть стандарт или подсистему. Нажмите на название зоны, чтобы открыть её правила.'))),
      h(Panel, { data, nodes, sel, setSel, q, setQ, results }));
  }

  function SkillsTab({ data }) {
    const items = [...data.skills.map((s) => ({ ...s, kind: 'скилл' })), ...data.agents.map((a) => ({ ...a, kind: 'агент' })),
      { name: 'check-bsl', kind: 'хук', description: SPECIAL.hook.about, path: 'plugins/onec-pack/scripts/check-bsl.mjs' }];
    const [cur, setCur] = useState(items.find((i) => i.name === 'onec-core') || items[0]);
    const size = (r) => r && r.files ? ` · ${r.files} файлов справки, ${(r.bytes / 1048576).toFixed(1)} МБ` : '';
    return h('div', { className: 'split' },
      h('div', { className: 'cards', style: { gridTemplateColumns: 'minmax(0,1fr)' } }, items.map((s) => h('button', { key: s.name, 'aria-pressed': cur.name === s.name, onClick: () => setCur(s) },
        h('span', { className: 'eyebrow' }, s.kind + size(s.references)), h('h3', null, s.name), h('p', null, s.description)))),
      h('div', { className: 'card page' }, h('div', { className: 'eyebrow' }, cur.path),
        h(FileDetail, { key: cur.path, path: cur.path })));
  }

  function SourcesTab({ data }) {
    const c = data.counts;
    return h('div', { className: 'card page prose' },
      h('h2', null, 'Что это'),
      h('p', null, `onec-pack — плагин для Claude Code, «мозг» 1С-отдела. Когда разработчик просит Claude написать, проверить или спроектировать доработку 1С, плагин подгружает нужные правила: стандарты 1С, рецепты БСП, правила запросов, интеграций и расширений. Сайт показывает, что внутри: ${c.files} файлов, ${(c.bytes / 1048576).toFixed(1)} МБ.`),
      h('h2', null, 'Установка в Claude Code'),
      h('pre', { className: 'install' }, 'claude plugin marketplace add AzamatRaimbekov/onec-brain\nclaude plugin install onec-pack@onec-brain'),
      h('p', null, 'После установки перезапустите Claude Code и начните с любого запроса про 1С: «напиши проведение документа», «проверь модуль», «как сделать печатную форму на БСП».'),
      h('h2', null, 'На чём построены скиллы'),
      h('ul', null,
        h('li', null, h('b', null, `Стандарты разработки 1С (${c.standards} документов). `), 'Система стандартов its.1c.ru/db/v8std, снимок 7 октября 2026. Каждый документ пересказан своими словами со ссылкой на первоисточник; это не копия, при споре прав сайт 1С.'),
        h('li', null, h('b', null, `БСП 3.2.1.541 (${c.bspSubsystems} подсистем, ${c.bspMethods} методов). `), 'Исходный код «1С:Библиотека стандартных подсистем» © ООО «1С-Софт», лицензия CC BY 4.0, зеркало github.com/1c-syntax/ssl_3_2. Справочник API сохраняет оригинальные комментарии методов; рецепты встраивания написаны по исходнику, каждое имя метода проверено.'),
        h('li', null, h('b', null, 'Правила команды. '), 'Работа в Конфигураторе без Git, передача кода, расширения поверх типовых, интеграции с бэкендом через HTTP и outbox, префикс мд_ для своих объектов.')),
      h('h2', null, 'Как обновить сайт'),
      h('pre', { className: 'install' }, 'npm run site      # пересобрать данные и открыть http://localhost:4173/site/\nnpm test          # проверить хук check-bsl, данные и манифесты'),
      h('p', null, 'Сайт собирается из файлов плагина: после правки скиллов достаточно пересобрать данные. ', h('a', { href: REPO }, 'Исходники на GitHub'), '.'),
      h('p', { className: 'hint' }, `Данные собраны ${data.builtAt}.`));
  }

  const TABS = [['', 'Мозг'], ['skills', 'Скиллы'], ['sources', 'Источники и установка']];
  function App({ data }) {
    const nodes = useMemo(() => [
      ...data.std.map((s) => ({ ...s, kind: 'std' })),
      ...data.bsp.map((b) => ({ ...b, kind: 'bsp', zone: 'bsp', id: b.name, title: b.purpose })),
    ], [data]);
    const [tab, setTab] = useState(location.hash.slice(1));
    useEffect(() => { const f = () => setTab(location.hash.slice(1)); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
    const c = data.counts;
    return h(React.Fragment, null,
      h('header', { className: 'top' },
        h('div', null, h('h1', null, 'Мозг 1С'), h('p', null, 'Плагин onec-pack для Claude Code: стандарты разработки 1С, Библиотека стандартных подсистем, скиллы и агенты для работы в Конфигураторе.')),
        h('div', { className: 'stats' }, [[c.standards, 'стандартов'], [c.bspSubsystems, 'подсистем БСП'], [c.bspMethods, 'методов API'], [c.skills, 'скиллов'], [c.agents, 'агента'], ['v' + data.plugin.version, 'плагин']]
          .map(([b, s]) => h('div', { key: s, className: 'stat' }, h('b', null, b), h('span', null, s))))),
      h('nav', { className: 'tabs' }, TABS.map(([id, label]) => h('a', { key: id, href: '#' + id, 'aria-current': tab === id ? 'page' : undefined }, label))),
      tab === 'skills' ? h(SkillsTab, { data }) : tab === 'sources' ? h(SourcesTab, { data }) : h(BrainTab, { data, nodes }),
      h('p', { className: 'foot' }, 'Источники: its.1c.ru/db/v8std (пересказ со ссылками) и исходный код БСП 3.2.1.541 (© 1С-Софт, CC BY 4.0). ', h('a', { href: REPO }, 'GitHub')));
  }

  const root = ReactDOM.createRoot(document.getElementById('app'));
  fetch('data/brain.json').then((r) => r.json()).then((data) => root.render(h(App, { data })),
    () => root.render(h('p', { className: 'boot' }, 'Нет site/data/brain.json. Запустите npm run site в корне репозитория.')));
})();
