// Brain geometry: zones, anatomical silhouette, cortex folds and the deterministic neuron layout.
// Exposes window.BrainGeo = { ZONES, SPECIAL, CORE, VIEW, CEREBRUM, CEREBELLUM, STEM, SULCI, FOLDS, FOLIA, labelBox, layout }.
(function () {
  const ZONES = {
    code:    { name: 'Код', anat: 'лобная доля', at: [235, 235], skill: 'onec-code-standards',
               about: 'Как пишется BSL: области модулей, имена, комментарии, параметры, исключения, журнал регистрации.',
               rules: ['Области модуля в стандартном порядке, без пустых областей (std455)',
                       'У экспортного метода комментарий: описание, Параметры, Возвращаемое значение (std453)',
                       'Нет закомментированного кода, TODO и фамилий; табуляция, строка до 120 символов (std456)',
                       'Не присваивать Отказ = Ложь; Отказ = Истина всегда с сообщением (std686)',
                       'Нет пустого Исключение: перехват локально и проброс (std499)'] },
    meta:    { name: 'Метаданные', anat: 'лобная, нижняя часть', at: [225, 380], skill: 'onec-v8std',
               about: 'Общие модули и их флаги, имена и синонимы объектов, типы реквизитов, предопределённые элементы.',
               rules: ['Вид, флаги и постфикс общего модуля совпадают (std469)',
                       'ТекущаяДатаСеанса() вместо ТекущаяДата() (std643)',
                       'Синоним обязателен, имя до 80 символов, без «ё» (std474)',
                       'Составной тип в соединениях только из ссылочных типов (std728)',
                       'Устаревший объект переименовать в Удалить…, а не удалять (std534)'] },
    cs:      { name: 'Клиент-сервер', anat: 'моторная кора', at: [430, 112], skill: 'onec-code-standards',
               about: 'Сколько раз форма ходит на сервер и что передаёт.',
               rules: ['В клиентском ПриОткрытии нет серверных вызовов (std487)',
                       'Команда формы делает не больше одного серверного вызова (std487)',
                       'Таймаут у каждого HTTPСоединение и WS-прокси (std748)',
                       'Неограниченные выборки обрабатывать порциями (std725)'] },
    sec:     { name: 'Безопасность', anat: 'теменная доля', at: [610, 108], skill: 'onec-code-standards',
               about: 'Роли, RLS, привилегированный режим, внешний код и секреты.',
               rules: ['Нет Выполнить/Вычислить над внешним текстом (std770)',
                       'Привилегированный режим включается точечно (std485)',
                       'Серверные методы формы заново проверяют права (std678)',
                       'Пароли только в безопасном хранилище (std740)'] },
    events:  { name: 'События', anat: 'центральная извилина', at: [380, 250], skill: 'onec-code-standards',
               about: 'ПередЗаписью, ПриЗаписи, проверка и обработка заполнения, регламентные задания.',
               rules: ['Первой строкой: Если ОбменДанными.Загрузка Тогда Возврат (std773)',
                       'В ПриЗаписи не менять записываемый объект (std465)',
                       'Обязательные реквизиты через «Проверка заполнения» (std478)',
                       'Регламентные задания не чаще раза в минуту (std402)'] },
    queries: { name: 'Запросы', anat: 'височная доля', at: [415, 488], skill: 'onec-queries',
               about: 'Текст запросов, индексы, виртуальные и временные таблицы, разыменование.',
               rules: ['Нет запросов в цикле (std436)',
                       'Условия на виртуальную таблицу в её параметрах (std657)',
                       'Нет разыменования полей составного типа (std654)',
                       'Нет соединений с вложенными запросами (std655)',
                       'ОБЪЕДИНИТЬ ВСЕ по умолчанию (std434)'] },
    locks:   { name: 'Транзакции', anat: 'гиппокамп', at: [580, 470], skill: 'onec-code-standards',
               about: 'Управляемые блокировки, шаблон транзакции, запись наборов регистров.',
               rules: ['Управляемый режим, без ДЛЯ ИЗМЕНЕНИЯ (std460)',
                       'БлокировкаДанных до чтения изменяемых данных (std648)',
                       'Транзакция короче 20 секунд и без HTTP внутри (std783)',
                       'Заблокировать() перед изменением объекта из кода (std490)'] },
    lib:     { name: 'Обмен и библиотеки', anat: 'теменно-затылочная', at: [700, 190], skill: 'onec-integrations',
               about: 'Обмен данными, разработка библиотек, обработчики обновления, НСтр и форматы.',
               rules: ['Текст для пользователя через НСтр и СтрШаблон (std761)',
                       'Модули …Переопределяемый не вызываются из прикладного кода (std553)',
                       'Обработчик обновления идемпотентен (std690)',
                       'API библиотеки только расширяется (std644)'] },
    bsp:     { name: 'БСП', anat: 'подкорка: на ней стоит всё остальное', at: [530, 300], label: [530, 252], skill: 'onec-bsp',
               about: 'Библиотека стандартных подсистем 3.2.1. Если в БСП есть готовое, используем его.',
               rules: ['Реквизиты по ссылке через ОбщегоНазначения.ЗначенияРеквизитовОбъекта',
                       'Фон из формы через ДлительныеОперации.ВыполнитьФункцию',
                       'Встраивание через определяемые типы, подписки и …Переопределяемый',
                       'Команды печати в ДобавитьКомандыПечати, макеты через МакетПечатнойФормы',
                       'Роли только профилями групп доступа',
                       'На типовой переопределяемые процедуры заполняются в расширении'] },
    ui:      { name: 'Интерфейс', anat: 'затылочная доля', at: [805, 330], skill: 'onec-v8std',
               about: 'Управляемые формы, списки, диалоги, длительные операции, дизайн интерфейса 8.3, 8.5 и 8.2.',
               rules: ['Дольше 8 секунд выполнять в фоновом задании (std642)',
                       'Нет модальных окон (std703)',
                       'Объект записывается только по действию пользователя (std800)',
                       'СообщитьПользователю вместо Сообщить (std418)'] },
  };
  const SPECIAL = {
    architect: { name: 'onec-architect', kind: 'агент', at: [735, 548], path: 'plugins/onec-pack/agents/onec-architect.md' },
    reviewer:  { name: 'onec-reviewer', kind: 'агент', at: [812, 582], path: 'plugins/onec-pack/agents/onec-reviewer.md' },
    hook:      { name: 'check-bsl', kind: 'хук', at: [878, 528], path: 'plugins/onec-pack/scripts/check-bsl.mjs',
                 about: 'После каждой правки .bsl проверяет новые строки: запросы в цикле, Сообщить, модальные вызовы, Выполнить, шаблон транзакции, пустое Исключение, длину строки.' },
    base:      { name: 'Ваша база', kind: 'база', at: [652, 694], side: true,
                 about: 'Конфигурация, выгруженная в файлы из Конфигуратора. Claude читает модули и метаданные оттуда, а код возвращает для вставки в Конфигуратор.' },
  };
  const CORE = [530, 300];
  const VIEW = [0, 0, 1000, 740];

  // Side view, frontal lobe on the left; the temporal lobe hangs below the lateral fissure.
  const CEREBRUM = 'M168 452 C108 418 92 312 126 236 C162 152 262 84 386 62 C506 40 648 52 758 102 C866 152 932 252 920 346 '
    + 'C912 414 870 458 800 472 C742 482 694 494 656 524 C612 560 540 580 458 572 C378 564 318 532 298 484 C282 452 232 458 168 452Z';
  const CEREBELLUM = 'M664 506 C694 474 764 464 834 472 C896 480 934 514 912 556 C890 598 814 616 744 606 C692 598 652 566 664 506Z';
  const STEM = 'M612 540 C622 600 624 650 636 716 Q652 726 670 716 C672 650 676 600 684 532Z';
  const SULCI = ['M298 484 C362 432 452 410 562 392 C626 382 664 360 694 326',
                 'M548 50 C530 120 566 170 526 232 C498 274 506 330 476 402'];

  function rng(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const ctx = document.createElement('canvas').getContext('2d');
  const BRAIN = new Path2D(CEREBRUM);
  const inPath = (p, x, y, pad) => [[0, 0], [pad, 0], [-pad, 0], [0, pad], [0, -pad], [pad * .7, pad * .7], [-pad * .7, pad * .7], [pad * .7, -pad * .7], [-pad * .7, -pad * .7]]
    .every(([dx, dy]) => ctx.isPointInPath(p, x + dx, y + dy));

  // Meandering strokes clipped to the cortex read as gyri.
  function folds(path, count, seed, len) {
    const r = rng(seed), out = [];
    while (out.length < count) {
      let x = 100 + r() * 830, y = 50 + r() * 560;
      if (!ctx.isPointInPath(path, x, y)) continue;
      let a = r() * Math.PI * 2, d = `M${x.toFixed(0)} ${y.toFixed(0)}`;
      for (let k = 0; k < len; k++) {
        a += (r() - 0.5) * 2.2;
        const s = 16 + r() * 18, cx = x + Math.cos(a) * s, cy = y + Math.sin(a) * s;
        a += (r() - 0.5) * 1.6; x = cx + Math.cos(a) * s; y = cy + Math.sin(a) * s;
        d += ` Q${cx.toFixed(0)} ${cy.toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)}`;
      }
      out.push(d);
    }
    return out;
  }
  const FOLDS = folds(BRAIN, 64, 83, 4);
  const FOLIA = [0, 1, 2, 3, 4, 5].map((k) => `M${668 + k * 4} ${500 + k * 17} C740 ${486 + k * 19} 840 ${488 + k * 19} ${922 - k * 9} ${512 + k * 16}`);

  const labelBox = (id) => {
    const Z = ZONES[id], [x, y] = Z.label || Z.at, w = Z.name.length * 8.4 + 26;
    return { x: x - w / 2, y: y - 14, w, h: 28 };
  };

  // Each neuron lands in its own zone: a sample is kept only if its zone is the nearest one (weighted by zone size),
  // it stays inside the cortex and it does not cover a zone label or the core.
  function layout(nodes) {
    const r = rng(1606), pos = [], placed = [], byZone = {};
    nodes.forEach((n, i) => (byZone[n.zone] = byZone[n.zone] || []).push(i));
    const w = {};
    for (const [z, ids] of Object.entries(byZone)) w[z] = 30 + 8.8 * Math.sqrt(ids.length);
    const nearest = (x, y) => {
      let best = null, bd = Infinity;
      for (const z of Object.keys(w)) { const d = Math.hypot(x - ZONES[z].at[0], y - ZONES[z].at[1]) / w[z]; if (d < bd) { bd = d; best = z; } }
      return best;
    };
    const boxes = Object.keys(ZONES).map(labelBox);
    const onLabel = (x, y) => boxes.some((b) => x > b.x - 7 && x < b.x + b.w + 7 && y > b.y - 7 && y < b.y + b.h + 7);
    for (const [z, ids] of Object.entries(byZone)) {
      const [cx, cy] = ZONES[z].at;
      for (const i of ids) {
        let x, y, tries = 0, minD = 13.5;
        do {
          const a = r() * Math.PI * 2, d = w[z] * Math.sqrt(r()) * (1 + tries / 120);
          x = cx + Math.cos(a) * d * 1.25; y = cy + Math.sin(a) * d * 0.85; tries++;
          if (tries % 60 === 0) minD -= 1;
        } while (tries < 700 && (!inPath(BRAIN, x, y, 18) || Math.hypot(x - CORE[0], y - CORE[1]) < 40 || onLabel(x, y)
                 || nearest(x, y) !== z || placed.some((p) => (p[0] - x) ** 2 + (p[1] - y) ** 2 < minD * minD)));
        placed.push([x, y]); pos[i] = [x, y];
      }
    }
    const edges = [], zones = {};
    for (const [z, ids] of Object.entries(byZone)) {
      for (const i of ids) {
        const [x, y] = pos[i];
        ids.filter((j) => j !== i).map((j) => [j, (pos[j][0] - x) ** 2 + (pos[j][1] - y) ** 2]).sort((a, b) => a[1] - b[1]).slice(0, 2)
          .forEach(([j]) => { const e = i < j ? [i, j] : [j, i]; if (!edges.some((f) => f[0] === e[0] && f[1] === e[1])) edges.push(e); });
      }
      const xs = ids.map((i) => pos[i][0]), ys = ids.map((i) => pos[i][1]);
      const c = [xs.reduce((a, b) => a + b) / ids.length, ys.reduce((a, b) => a + b) / ids.length];
      zones[z] = { c, r: Math.max(48, ...ids.map((i) => Math.hypot(pos[i][0] - c[0], pos[i][1] - c[1]))) + 26,
                   box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
    }
    return { pos, edges, zones };
  }

  window.BrainGeo = { ZONES, SPECIAL, CORE, VIEW, CEREBRUM, CEREBELLUM, STEM, SULCI, FOLDS, FOLIA, labelBox, layout };
})();
