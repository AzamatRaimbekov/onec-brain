// Brain map: zones, silhouette geometry, deterministic neuron layout and the SVG component.
// Exposes window.BrainMap = { ZONES, SPECIAL, Brain, zoneColor }.
(function () {
  const h = React.createElement;
  const { useMemo } = React;

  const ZONES = {
    code:    { name: 'Код', anat: 'лобная доля', at: [215, 205], skill: 'onec-code-standards',
               about: 'Как пишется BSL: области модулей, имена, комментарии, параметры, исключения, журнал регистрации.',
               rules: ['Области модуля в стандартном порядке, без пустых областей (std455)',
                       'У экспортного метода комментарий: описание, Параметры, Возвращаемое значение (std453)',
                       'Нет закомментированного кода, TODO и фамилий; табуляция, строка до 120 символов (std456)',
                       'Не присваивать Отказ = Ложь; Отказ = Истина всегда с сообщением (std686)',
                       'Нет пустого Исключение: перехват локально и проброс (std499)'] },
    meta:    { name: 'Метаданные', anat: 'лобная, нижняя часть', at: [185, 395], skill: 'onec-v8std',
               about: 'Общие модули и их флаги, имена и синонимы объектов, типы реквизитов, предопределённые элементы.',
               rules: ['Вид, флаги и постфикс общего модуля совпадают (std469)',
                       'ТекущаяДатаСеанса() вместо ТекущаяДата() (std643)',
                       'Синоним обязателен, имя до 80 символов, без «ё» (std474)',
                       'Составной тип в соединениях только из ссылочных типов (std728)',
                       'Устаревший объект переименовать в Удалить…, а не удалять (std534)'] },
    cs:      { name: 'Клиент-сервер', anat: 'моторная кора', at: [430, 105], skill: 'onec-code-standards',
               about: 'Сколько раз форма ходит на сервер и что передаёт.',
               rules: ['В клиентском ПриОткрытии нет серверных вызовов (std487)',
                       'Команда формы делает не больше одного серверного вызова (std487)',
                       'Таймаут у каждого HTTPСоединение и WS-прокси (std748)',
                       'Неограниченные выборки обрабатывать порциями (std725)'] },
    sec:     { name: 'Безопасность и права', anat: 'теменная доля', at: [625, 135], skill: 'onec-code-standards',
               about: 'Роли, RLS, привилегированный режим, внешний код и секреты.',
               rules: ['Нет Выполнить/Вычислить над внешним текстом (std770)',
                       'Привилегированный режим включается точечно (std485)',
                       'Серверные методы формы заново проверяют права (std678)',
                       'Пароли только в безопасном хранилище (std740)'] },
    events:  { name: 'События объектов', anat: 'центральная извилина', at: [330, 300], skill: 'onec-code-standards',
               about: 'ПередЗаписью, ПриЗаписи, проверка и обработка заполнения, регламентные задания.',
               rules: ['Первой строкой: Если ОбменДанными.Загрузка Тогда Возврат (std773)',
                       'В ПриЗаписи не менять записываемый объект (std465)',
                       'Обязательные реквизиты через «Проверка заполнения» (std478)',
                       'Регламентные задания не чаще раза в минуту (std402)'] },
    queries: { name: 'Запросы', anat: 'височная доля', at: [395, 480], skill: 'onec-queries',
               about: 'Текст запросов, индексы, виртуальные и временные таблицы, разыменование.',
               rules: ['Нет запросов в цикле (std436)',
                       'Условия на виртуальную таблицу в её параметрах (std657)',
                       'Нет разыменования полей составного типа (std654)',
                       'Нет соединений с вложенными запросами (std655)',
                       'ОБЪЕДИНИТЬ ВСЕ по умолчанию (std434)'] },
    locks:   { name: 'Транзакции и блокировки', anat: 'гиппокамп', at: [575, 475], skill: 'onec-code-standards',
               about: 'Управляемые блокировки, шаблон транзакции, запись наборов регистров.',
               rules: ['Управляемый режим, без ДЛЯ ИЗМЕНЕНИЯ (std460)',
                       'БлокировкаДанных до чтения изменяемых данных (std648)',
                       'Транзакция короче 20 секунд и без HTTP внутри (std783)',
                       'Заблокировать() перед изменением объекта из кода (std490)'] },
    lib:     { name: 'Обмен, БСП, локализация', anat: 'теменно-затылочная', at: [705, 300], skill: 'onec-integrations',
               about: 'Обмен данными, разработка библиотек, обработчики обновления, НСтр и форматы.',
               rules: ['Текст для пользователя через НСтр и СтрШаблон (std761)',
                       'Модули …Переопределяемый не вызываются из прикладного кода (std553)',
                       'Обработчик обновления идемпотентен (std690)',
                       'API библиотеки только расширяется (std644)'] },
    bsp:     { name: 'БСП', anat: 'подкорка: на ней стоит всё остальное', at: [510, 300], skill: 'onec-bsp',
               about: 'Библиотека стандартных подсистем 3.2.1. Если в БСП есть готовое, используем его.',
               rules: ['Реквизиты по ссылке через ОбщегоНазначения.ЗначенияРеквизитовОбъекта',
                       'Фон из формы через ДлительныеОперации.ВыполнитьФункцию',
                       'Встраивание через определяемые типы, подписки и …Переопределяемый',
                       'Команды печати в ДобавитьКомандыПечати, макеты через МакетПечатнойФормы',
                       'Роли только профилями групп доступа',
                       'На типовой переопределяемые процедуры заполняются в расширении'] },
    ui:      { name: 'Интерфейс', anat: 'затылочная доля', at: [840, 285], skill: 'onec-v8std',
               about: 'Управляемые формы, списки, диалоги, длительные операции, дизайн интерфейса 8.3, 8.5 и 8.2.',
               rules: ['Дольше 8 секунд выполнять в фоновом задании (std642)',
                       'Нет модальных окон (std703)',
                       'Объект записывается только по действию пользователя (std800)',
                       'СообщитьПользователю вместо Сообщить (std418)'] },
  };
  const SPECIAL = {
    architect: { name: 'onec-architect', kind: 'агент', at: [705, 548], path: 'plugins/onec-pack/agents/onec-architect.md' },
    reviewer:  { name: 'onec-reviewer', kind: 'агент', at: [790, 590], path: 'plugins/onec-pack/agents/onec-reviewer.md' },
    hook:      { name: 'check-bsl', kind: 'хук', at: [858, 532], path: 'plugins/onec-pack/scripts/check-bsl.mjs',
                 about: 'После каждой правки .bsl проверяет новые строки: запросы в цикле, Сообщить, модальные вызовы, Выполнить, шаблон транзакции, пустое Исключение, длину строки.' },
    base:      { name: 'Ваша база', kind: 'информационная база', at: [612, 668],
                 about: 'Конфигурация, выгруженная в файлы из Конфигуратора. Claude читает модули и метаданные оттуда, а код возвращает для вставки в Конфигуратор.' },
  };
  const CORE = [510, 300];
  const C = { cx: 505, cy: 315, rx: 425, ry: 265 };
  const zoneColor = (z) => `var(--l-${z})`;

  function rng(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const bump = (a) => 1 + 0.022 * Math.sin(13 * a) + 0.014 * Math.sin(29 * a + 1);
  function inside(x, y, pad) {
    const dx = (x - C.cx) / (C.rx - pad), dy = (y - C.cy) / (C.ry - pad);
    return dx * dx + dy * dy * (y > 470 && x > 560 ? 1.25 : 1) < 1;
  }
  function outline() {
    const pts = [];
    for (let i = 0; i <= 240; i++) {
      const a = i / 240 * Math.PI * 2, k = bump(a);
      const x = C.cx + Math.cos(a) * C.rx * k;
      let y = C.cy + Math.sin(a) * C.ry * k;
      if (y > 470 && x > 560) y = 470 + (y - 470) * 0.8;
      pts.push((i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1));
    }
    return pts.join(' ') + 'Z';
  }
  const OUTLINE = outline();
  const SULCI = ['M470 62 C455 160 500 230 470 300 S430 420 455 520', 'M215 330 C300 360 380 380 470 372 S640 360 720 395',
    'M150 220 C190 200 240 205 280 180', 'M600 110 C630 160 690 175 730 160', 'M760 200 C800 240 860 245 905 230',
    'M300 520 C340 500 380 505 410 535', 'M620 500 C650 470 690 470 720 480', 'M330 90 C350 140 330 180 360 220'];

  // Each neuron lands in its own zone: a sample is kept only if its zone is the nearest one (weighted by zone size).
  function layout(nodes) {
    const r = rng(1606), pos = [], placed = [], byZone = {};
    nodes.forEach((n, i) => (byZone[n.zone] = byZone[n.zone] || []).push(i));
    const w = {};
    for (const [z, ids] of Object.entries(byZone)) w[z] = 26 + 8.5 * Math.sqrt(ids.length);
    const nearest = (x, y) => {
      let best = null, bd = Infinity;
      for (const z of Object.keys(w)) { const d = Math.hypot(x - ZONES[z].at[0], y - ZONES[z].at[1]) / w[z]; if (d < bd) { bd = d; best = z; } }
      return best;
    };
    for (const [z, ids] of Object.entries(byZone)) {
      const [cx, cy] = ZONES[z].at;
      for (const i of ids) {
        let x, y, tries = 0, minD = 13;
        do {
          const a = r() * Math.PI * 2, d = w[z] * Math.sqrt(r()) * (1 + tries / 120);
          x = cx + Math.cos(a) * d * 1.25; y = cy + Math.sin(a) * d * 0.85; tries++;
          if (tries % 60 === 0) minD -= 1;
        } while (tries < 600 && (!inside(x, y, 24) || Math.hypot(x - CORE[0], y - CORE[1]) < 34 || nearest(x, y) !== z
                 || placed.some((p) => (p[0] - x) ** 2 + (p[1] - y) ** 2 < minD * minD)));
        placed.push([x, y]); pos[i] = [x, y];
      }
    }
    const edges = [];
    for (const ids of Object.values(byZone)) for (const i of ids) {
      const [x, y] = pos[i];
      ids.filter((j) => j !== i).map((j) => [j, (pos[j][0] - x) ** 2 + (pos[j][1] - y) ** 2]).sort((a, b) => a[1] - b[1]).slice(0, 2)
        .forEach(([j]) => { const e = i < j ? [i, j] : [j, i]; if (!edges.some((f) => f[0] === e[0] && f[1] === e[1])) edges.push(e); });
    }
    return { pos, edges };
  }
  const curve = (a, b, bend) => `M${a[0]} ${a[1]} Q${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2 - bend} ${b[0]} ${b[1]}`;

  function Brain({ nodes, sel, setSel, hover, setHover, match }) {
    const { pos, edges } = useMemo(() => layout(nodes), [nodes]);
    const activeZone = sel && sel.type === 'zone' ? sel.id : sel && sel.type === 'node' ? nodes[sel.id].zone : null;
    const dim = (i) => (match && !match.has(i)) || (!match && activeZone && nodes[i].zone !== activeZone);
    const svgLine = (props) => h('path', { fill: 'none', ...props });
    return h('svg', { viewBox: '0 0 1000 720', role: 'img', 'aria-label': 'Карта мозга 1С по зонам' },
      svgLine({ d: 'M575 560 C590 610 585 660 600 715 L655 715 C640 660 650 600 640 560 Z', fill: 'var(--bg)', stroke: 'var(--skull)', strokeWidth: 2 }),
      h('ellipse', { cx: 790, cy: 560, rx: 135, ry: 78, fill: 'var(--bg)', stroke: 'var(--skull)', strokeWidth: 2 }),
      [0, 1, 2, 3, 4].map((k) => svgLine({ key: 'cb' + k, d: `M${670 + k * 6} ${520 + k * 18} C740 ${505 + k * 20} 840 ${505 + k * 20} ${915 - k * 8} ${528 + k * 17}`, stroke: 'var(--skull)', strokeWidth: 1.2 })),
      svgLine({ d: OUTLINE, fill: 'var(--bg)', stroke: 'var(--skull)', strokeWidth: 2.5 }),
      SULCI.map((d, k) => svgLine({ key: 's' + k, d, stroke: 'var(--skull)', strokeWidth: 1.6, strokeLinecap: 'round' })),
      Object.entries(ZONES).map(([id, Z]) => svgLine({ key: 'hub' + id, d: curve(Z.at, CORE, 40), stroke: zoneColor(id), strokeWidth: 1.6, opacity: activeZone && activeZone !== id ? 0.15 : 0.55, className: 'pulse' })),
      Object.entries(SPECIAL).map(([id, S]) => svgLine({ key: 'sp' + id, d: curve(S.at, CORE, -30), stroke: 'var(--hub)', strokeWidth: 1, opacity: 0.25 })),
      edges.map(([a, b], k) => h('line', { key: 'e' + k, x1: pos[a][0], y1: pos[a][1], x2: pos[b][0], y2: pos[b][1], stroke: zoneColor(nodes[a].zone), strokeWidth: 0.9, opacity: dim(a) ? 0.08 : 0.4 })),
      nodes.map((n, i) => {
        const on = (sel && sel.type === 'node' && sel.id === i) || hover === i;
        return h('circle', { key: i, className: 'neuron', cx: pos[i][0], cy: pos[i][1], r: on ? 8 : 4.6, fill: zoneColor(n.zone), opacity: dim(i) ? 0.15 : 0.95,
          stroke: on ? 'var(--ink)' : 'none', strokeWidth: 2, onMouseEnter: () => setHover(i), onMouseLeave: () => setHover(null), onClick: () => setSel({ type: 'node', id: i }) });
      }),
      h('circle', { cx: CORE[0], cy: CORE[1], r: 22, fill: 'var(--hub)', style: { cursor: 'pointer' }, onClick: () => setSel(null) }),
      h('text', { x: CORE[0], y: CORE[1] + 4, textAnchor: 'middle', fill: 'var(--surface)', style: { font: '700 10px var(--mono)', pointerEvents: 'none' } }, 'core'),
      Object.entries(ZONES).map(([id, Z]) => h('text', { key: 'l' + id, x: Z.at[0], y: Z.at[1] - (id === 'bsp' ? 34 : 8), textAnchor: 'middle', className: 'lobe-label', fill: zoneColor(id),
        opacity: activeZone && activeZone !== id ? 0.35 : 1, onClick: () => setSel({ type: 'zone', id }) }, Z.name)),
      Object.entries(SPECIAL).map(([id, S]) => h('g', { key: 'g' + id, style: { cursor: 'pointer' }, onClick: () => setSel({ type: 'special', id }) },
        h('rect', { x: S.at[0] - 7, y: S.at[1] - 7, width: 14, height: 14, rx: 3, fill: 'var(--surface)', stroke: 'var(--hub)', strokeWidth: 2 }),
        h('text', { x: S.at[0], y: S.at[1] + 24, textAnchor: 'middle', className: 'small-label' }, S.name))));
  }

  window.BrainMap = { ZONES, SPECIAL, Brain, zoneColor };
})();
