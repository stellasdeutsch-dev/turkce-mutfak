/* Турецкий на кухне — вся интерактивность кроме 3D (она в kitchen3d.js). */
(() => {
  const K = window.KITCHEN;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* приватный режим */ } }
  };
  const WORD = Object.fromEntries(K.words.map((w, i) => [w.id, { ...w, n: i + 1 }]));
  const TOTAL = K.words.length;

  /* ================= ОЗВУЧКА ================= */
  const TEXT = {};
  K.words.forEach((w) => { TEXT[w.id] = w.tr; TEXT[w.id + '-ex'] = w.ex[0]; });
  K.phrases.forEach((p) => { TEXT[p.id] = p.tr; });
  K.extra.forEach((x) => { TEXT[x.id] = x.tr; });
  K.lik.forEach((l) => { TEXT[l.id] = l.form; });
  K.compounds.forEach((c) => { TEXT[c.id] = c.form; });
  K.places.forEach((p) => { TEXT[p.id] = p.form; });
  K.things.forEach((t) => {
    const s = t.id.slice(2);
    TEXT[t.id] = t.tr; TEXT['q-' + s] = t.tr + ' nerede?';
    K.places.forEach((p) => { TEXT[`s-${s}-${p.id.slice(2)}`] = `${t.tr} ${p.form}.`; });
  });

  const cache = new Map();
  let current = null;
  function stopAll() {
    if (current) { current.a.pause(); current.done(); current = null; }
    try { speechSynthesis.cancel(); } catch (e) { /* нет синтеза */ }
  }
  function tts(id, rate) {
    return new Promise((res) => {
      try {
        const u = new SpeechSynthesisUtterance(TEXT[id] || id);
        u.lang = 'tr-TR';
        u.rate = rate * 0.9;
        const v = speechSynthesis.getVoices().find((x) => /^tr/i.test(x.lang));
        if (v) u.voice = v;
        u.onend = u.onerror = res;
        speechSynthesis.speak(u);
      } catch (e) { res(); }
    });
  }
  function say(id, { rate = 1, el = null } = {}) {
    stopAll();
    let a = cache.get(id);
    if (!a) { a = new Audio(`audio/${id}.mp3`); a.preload = 'auto'; cache.set(id, a); }
    a.playbackRate = rate;
    a.preservesPitch = true;
    try { a.currentTime = 0; } catch (e) { /* ещё не загружено */ }
    const els = el ? [el] : [];
    els.forEach((e) => e.classList.add('playing'));
    document.dispatchEvent(new CustomEvent('say:start', { detail: { id } }));
    return new Promise((resolve) => {
      let finished = false, fell = false;
      const fallback = () => { if (fell) return; fell = true; tts(id, rate).then(done); };
      const done = () => {
        if (finished) return;
        finished = true;
        els.forEach((e) => e.classList.remove('playing'));
        document.dispatchEvent(new CustomEvent('say:end', { detail: { id } }));
        a.onended = a.onerror = null;
        if (current && current.a === a) current = null;
        resolve();
      };
      current = { a, done };
      a.onended = done;
      a.onerror = fallback;
      const p = a.play();
      if (p && p.catch) p.catch((err) => { if (err && err.name === 'NotAllowedError') done(); else fallback(); });
    });
  }
  // голоса Chrome грузятся асинхронно
  try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); } catch (e) { /* ok */ }

  /* ================= ПРОГРЕСС «УСЛЫШАНО» ================= */
  const heard = new Set(store.get('mutfak-heard', []).filter((id) => WORD[id]));
  function markHeard(id) {
    if (!WORD[id] || heard.has(id)) return;
    heard.add(id);
    store.set('mutfak-heard', [...heard]);
    renderHeard(true);
  }
  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function renderHeard(bump) {
    const n = heard.size;
    const chip = $('#kHeard');
    if (chip) {
      chip.textContent = `🔊 ${n}/${TOTAL}`;
      if (bump) { chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump'); }
    }
    $$('.w').forEach((w) => w.classList.toggle('heard', heard.has(w.dataset.id)));
    $('#pcHeard').textContent = n;
    $('#pcBar').style.setProperty('--p', (n / TOTAL).toFixed(3));
    $('#pcSub').textContent = n === 0
      ? 'Пока ты не нажал ни на один предмет. Кухня ждёт.'
      : n >= TOTAL ? 'Ты прослушал всю кухню. Все 26 слов.'
      : `Ты прослушал ${n} ${plural(n, 'слово', 'слова', 'слов')} из ${TOTAL}. Осталось ${TOTAL - n}.`;
    $('#finalHeard').textContent = n === 0
      ? 'Можешь начать с них. Прямо сейчас, наверху.'
      : n >= TOTAL ? 'Ты прослушал все двадцать шесть. Серьёзно.'
      : `Ты прослушал ${n} ${plural(n, 'слово', 'слова', 'слов')}. Мозг уже хочет закончить.`;
  }

  /* делегирование: любой [data-say] говорит */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-say]');
    if (!b) return;
    const id = b.dataset.say;
    say(id, { el: b });
    markHeard(id);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const b = e.target.closest && e.target.closest('[role="button"][data-say]');
    if (!b) return;
    e.preventDefault();
    b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  /* ================= ПОЯВЛЕНИЕ, СЧЁТЧИКИ, НАВИГАЦИЯ ================= */
  const counted = new WeakSet();
  function countUp(el) {
    if (counted.has(el)) return;
    counted.add(el);
    const to = +el.dataset.count;
    if (reduce) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 1400;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const io = new IntersectionObserver((ents) => {
    ents.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      $$('[data-count]', en.target).forEach(countUp);
      if (en.target.matches('[data-count]')) countUp(en.target);
      io.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-r]').forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute('data-r'));
    el.style.setProperty('--d', `${Math.min(sibs.indexOf(el), 5) * 0.07}s`);
    io.observe(el);
  });
  requestAnimationFrame(() => setTimeout(() => $('.h-hero').classList.add('in'), 120));

  const nav = $('.nav'), bar = $('.read-bar i'), blobs = $$('.blob');
  const sticky = $('#stickyCta'), mapSec = $('#map'), finalSec = $('#final');
  let finalVisible = false;
  new IntersectionObserver(([e]) => { finalVisible = e.isIntersecting; onScroll(); }, { threshold: 0.05 }).observe(finalSec);
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
      nav.classList.toggle('scrolled', y > 10);
      if (!reduce) blobs.forEach((b, i) => { b.style.translate = `0 ${(y - (b.parentElement.offsetTop || 0)) * (i % 2 ? -0.08 : 0.12)}px`; });
      const show = y > mapSec.offsetTop + 200 && !finalVisible;
      sticky.classList.toggle('show', show);
      sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
      $$('a', sticky).forEach((l) => { l.tabIndex = show ? 0 : -1; });
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const links = $$('.nav-links a');
  const secIO = new IntersectionObserver((ents) => {
    ents.forEach((e) => { if (e.isIntersecting) links.forEach((l) => l.classList.toggle('active', l.hash === '#' + e.target.id)); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('section[id]').forEach((s) => secIO.observe(s));

  // наклон карточек в hero за курсором
  const cards = $('.hero-cards');
  if (cards && !reduce && matchMedia('(pointer: fine)').matches) {
    cards.addEventListener('pointermove', (e) => {
      const r = cards.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      $$('.tilt', cards).forEach((c, i) => { c.style.transform = `perspective(700px) rotateY(${x * (10 + i * 3)}deg) rotateX(${-y * (10 + i * 3)}deg) translateZ(0)`; });
    });
    cards.addEventListener('pointerleave', () => $$('.tilt', cards).forEach((c) => { c.style.transform = ''; }));
  }

  /* ================= 3D-КУХНЯ: карточка, сетка, игра ================= */
  const kitchen = $('#kitchen');
  const kCard = $('#kCard');
  const ICON = {
    buzdolabi: '🧊', ocak: '🔥', firin: '♨️', davlumbaz: '💨', evye: '🚰', musluk: '💧', tezgah: '⬜', dolap: '🗄️',
    masa: '🟨', sandalye: '🪑', caydanlik: '🫖', demlik: '🫖', tencere: '🍲', tava: '🍳', bicak: '🔪', 'kesme-tahtasi': '🪵',
    tabak: '🍽️', 'cay-bardagi': '🍵', cezve: '☕', mikrodalga: '📟', 'bulasik-makinesi': '🫧', 'cop-kutusu': '🗑️',
    ekmek: '🥖', tuz: '🧂', kasik: '🥄', catal: '🍴'
  };

  // волна
  const wave = $('#kWave');
  for (let i = 0; i < 30; i++) {
    const b = document.createElement('i');
    b.style.setProperty('--dl', `${(Math.random() * -0.6).toFixed(2)}s`);
    wave.appendChild(b);
  }
  let cardId = null;
  document.addEventListener('say:start', (e) => {
    const id = e.detail.id;
    wave.classList.toggle('live', !!cardId && (id === cardId || id === cardId + '-ex'));
  });
  document.addEventListener('say:end', () => wave.classList.remove('live'));

  function showWord(id) {
    const w = WORD[id];
    if (!w) return;
    cardId = id;
    $('#kcRu').textContent = w.ru;
    $('#kcTr').textContent = w.tr;
    $('#kcPr').textContent = w.pr;
    $('#kcNote').textContent = w.note;
    $('#kcExTr').textContent = w.ex[0];
    $('#kcExRu').textContent = w.ex[1];
    $('#kcN').textContent = w.n;
    const th = THUMB(), img = $('#kcImg');
    if (th && th[id]) { img.src = th[id]; img.classList.remove('ok'); void img.offsetWidth; img.classList.add('ok'); } else img.classList.remove('ok');
    kCard.classList.add('full');
    kCard.classList.remove('pop'); void kCard.offsetWidth; kCard.classList.add('pop');
    kitchen.classList.add('picked');
  }
  $('#kcAgain').addEventListener('click', () => cardId && say(cardId));
  $('#kcSlow').addEventListener('click', () => cardId && say(cardId, { rate: 0.7 }));
  $('#kcEx').addEventListener('click', () => cardId && say(cardId + '-ex', { el: $('#kcEx') }));

  function openWord(id, { scroll = false } = {}) {
    showWord(id);
    if (window.Kitchen3D) window.Kitchen3D.focus(id);
    say(id, { el: $(`.w[data-id="${id}"]`) });
    markHeard(id);
    if (scroll) kitchen.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  }

  // сетка всех слов
  const grid = $('#words');
  K.words.forEach((w) => {
    const b = document.createElement('button');
    b.className = 'w';
    b.dataset.id = w.id;
    b.innerHTML = `<span class="ico">${ICON[w.id] || '•'}</span><b>${w.tr}</b><small>${w.ru}</small>`;
    b.addEventListener('click', () => {
      if (game.on) stopGame();
      openWord(w.id, { scroll: true });
    });
    grid.appendChild(b);
  });

  kitchen.addEventListener('kitchen:pick', (e) => {
    const id = e.detail.id;
    if (game.on) return checkGame(id);
    openWord(id);
  });

  // подписи
  $('#kLabels').addEventListener('click', (e) => {
    const on = kitchen.classList.toggle('labels');
    e.currentTarget.classList.toggle('on', on);
    e.currentTarget.setAttribute('aria-pressed', on);
  });
  const K3 = (fn, ...a) => window.Kitchen3D && window.Kitchen3D[fn](...a);
  $('#kZoomIn').addEventListener('click', () => K3('zoom', 0.82));
  $('#kZoomOut').addEventListener('click', () => K3('zoom', 1.2));
  $('#kRotL').addEventListener('click', () => K3('rotate', -0.35));
  $('#kRotR').addEventListener('click', () => K3('rotate', 0.35));
  $('#kReset').addEventListener('click', () => { K3('reset'); kCard.classList.remove('full'); cardId = null; });

  // игра «Найди на кухне»
  const game = { on: false, round: 0, score: 0, target: null, pool: [], busy: false };
  function startGame() {
    game.on = true; game.round = 0; game.score = 0;
    game.pool = shuffle(K.words.map((w) => w.id)).slice(0, 10);
    kitchen.classList.add('game');
    kCard.classList.add('gaming');
    $('#kGame').classList.add('on');
    $('#kGame').setAttribute('aria-pressed', 'true');
    $('#kGame').textContent = '✕ Выйти из игры';
    K3('reset');
    nextRound();
  }
  function stopGame() {
    game.on = false;
    kitchen.classList.remove('game');
    kCard.classList.remove('gaming');
    $('#kGame').classList.remove('on');
    $('#kGame').setAttribute('aria-pressed', 'false');
    $('#kGame').textContent = '🎯 Найди на кухне';
  }
  function nextRound() {
    if (game.round >= game.pool.length) return endGame();
    game.target = game.pool[game.round];
    game.round++;
    game.busy = false;
    $('#gRound').textContent = game.round;
    $('#gScore').textContent = game.score;
    $('#gWord').textContent = WORD[game.target].tr;
    const m = $('#gMsg'); m.className = 'kc-msg'; m.textContent = 'Слушай и нажимай на предмет.';
    say(game.target);
  }
  function checkGame(id) {
    if (game.busy || !game.target) return;
    const m = $('#gMsg');
    if (id === game.target) {
      game.busy = true;
      game.score++;
      $('#gScore').textContent = game.score;
      K3('flash', id, true);
      markHeard(id);
      m.className = 'kc-msg ok';
      m.textContent = `Doğru! ${WORD[id].tr} — ${WORD[id].ru}.`;
      setTimeout(nextRound, 1100);
    } else {
      K3('flash', id, false);
      kCard.classList.remove('shake'); void kCard.offsetWidth; kCard.classList.add('shake');
      m.className = 'kc-msg bad';
      m.textContent = WORD[id] ? `Это ${WORD[id].tr} — ${WORD[id].ru}. Ищи дальше.` : 'Не то. Ищи дальше.';
      if (WORD[id]) say(id);
    }
  }
  function endGame() {
    game.target = null;
    const m = $('#gMsg');
    m.className = 'kc-msg ok';
    m.textContent = `Готово: ${game.score} из 10. ${game.score >= 8 ? 'Эмре бы гордился.' : game.score >= 5 ? 'Неплохо. Ещё раунд?' : 'Кухня коварная. Попробуй ещё.'}`;
    $('#gWord').textContent = '—';
    if (game.score >= 7) confetti();
  }
  $('#kGame').addEventListener('click', () => (game.on ? stopGame() : startGame()));
  $('#gRepeat').addEventListener('click', () => { if (game.target) say(game.target); else if (!game.on || game.round >= 10) startGame(); });
  $('#gSkip').addEventListener('click', () => { if (game.on) nextRound(); });
  $('#gWord').addEventListener('click', () => game.target && say(game.target));

  /* ================= КОНСТРУКТОРЫ ================= */
  const PART = { buz: 'x-buz', dolap: 'dolap', 'çay': 'x-cay', bardak: 'x-bardak', kesme: 'x-kesme', tahta: 'x-tahta', 'bulaşık': 'x-bulasik', makine: 'x-makine', 'çöp': 'x-cop', kutu: 'x-kutu', mutfak: 'x-mutfak' };
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function diffMark(from, to) {
    let i = 0;
    while (i < from.length && i < to.length && from[i] === to[i]) i++;
    return esc(to.slice(0, i)) + (i < to.length ? `<span class="hl">${esc(to.slice(i))}</span>` : '');
  }
  let token = 0;

  // слово + слово
  const cmpStage = $('#cmpStage');
  const cmpChips = $('#cmpChips');
  async function playCompound(c, withSound) {
    const my = ++token;
    cmpStage.classList.remove('merge');
    $('#cmpA').textContent = c.a;
    $('#cmpB').textContent = c.b;
    $('#cmpGlue').textContent = c.glue;
    $('#cmpForm').textContent = c.form;
    $('#cmpRu').textContent = c.ru;
    if (withSound) {
      await say(PART[c.a] || c.id);
      if (my !== token) return;
      await say(PART[c.b] || c.id);
      if (my !== token) return;
    } else await wait(400);
    const bForm = c.form.startsWith(c.a) ? c.form.slice(c.a.length).trim() : c.form;
    $('#cmpB').innerHTML = diffMark(c.b, bForm);
    if (c.form.indexOf(' ') < 0) $('#cmpA').textContent = c.a; // слитно: buzdolabı
    cmpStage.classList.add('merge');
    if (withSound) { await wait(350); if (my === token) say(c.id, { el: $('#cmpOut') }); }
  }
  K.compounds.forEach((c, i) => {
    const b = document.createElement('button');
    b.textContent = `${c.a} + ${c.b}`;
    b.addEventListener('click', () => {
      $$('button', cmpChips).forEach((x) => x.classList.toggle('on', x === b));
      playCompound(c, true);
    });
    if (i === 0) b.classList.add('on');
    cmpChips.appendChild(b);
  });
  $('#cmpOut').addEventListener('click', () => {
    const c = K.compounds[$$('button', cmpChips).findIndex((x) => x.classList.contains('on'))] || K.compounds[0];
    say(c.id, { el: $('#cmpOut') });
  });
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { playCompound(K.compounds[0], false); o.disconnect(); } }, { threshold: 0.4 }).observe(cmpStage);

  // -lık
  const likChips = $('#likChips');
  const LIKBASE = { tuz: 'tuz', 'şeker': 'x-seker', ekmek: 'ekmek', sebze: 'x-sebze', yumurta: 'x-yumurta', biber: 'x-biber' };
  const lastVowel = (s) => { const m = s.match(/[aeıioöuüâ]/gi); return m ? m[m.length - 1] : ''; };
  async function playLik(l, withSound) {
    const my = ++token;
    const slot = $('#likSlot');
    $('#likBase').textContent = l.base;
    $('#likOut').style.opacity = 0.25;
    if (withSound) say(LIKBASE[l.base] || l.id);
    slot.classList.add('spin');
    const letters = ['ı', 'i', 'u', 'ü'];
    let k = 0;
    const iv = setInterval(() => { slot.innerHTML = `<i>${letters[k++ % 4]}</i>`; }, 70);
    await wait(reduce ? 50 : 850);
    clearInterval(iv);
    if (my !== token) return;
    slot.classList.remove('spin');
    slot.innerHTML = `<i>${l.v}</i>`;
    $('#likForm').innerHTML = esc(l.base) + `<span class="hl">${esc(l.form.slice(l.base.length))}</span>`;
    $('#likRu').textContent = `${l.ru} · последняя гласная «${lastVowel(l.base)}» → ${l.form.slice(l.base.length)}`;
    $('#likOut').style.opacity = 1;
    if (withSound) { await wait(250); if (my === token) say(l.id, { el: $('#likOut') }); }
  }
  K.lik.forEach((l, i) => {
    const b = document.createElement('button');
    b.textContent = `${l.base} · ${l.baseRu}`;
    b.addEventListener('click', () => {
      $$('button', likChips).forEach((x) => x.classList.toggle('on', x === b));
      playLik(l, true);
    });
    if (i === 0) b.classList.add('on');
    likChips.appendChild(b);
  });
  $('#likOut').addEventListener('click', () => {
    const l = K.lik[$$('button', likChips).findIndex((x) => x.classList.contains('on'))] || K.lik[0];
    say(l.id, { el: $('#likOut') });
  });
  playLik(K.lik[0], false);

  // где лежит?
  const FS = ['f', 's', 't', 'k', 'ç', 'ş', 'h', 'p'];
  $('#fsLetters').innerHTML = FS.map((c) => `<span data-l="${c}">${c}</span>`).join('');
  const loc = { thing: K.things[0], place: K.places[0] };
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  function renderLoc(withSound) {
    const { thing: t, place: p } = loc;
    const stem = p.form.slice(0, p.form.length - p.suf.length);
    $('#locQ').textContent = `${t.tr} nerede?`;
    $('#locSentence').innerHTML = `${esc(t.tr)} <span class="nw">${esc(stem)}<em>${esc(p.suf)}</em>.</span>`;
    $('#locRu').textContent = `${cap(t.ru)} ${p.ru}.`;
    $('#locWhy').textContent = p.why;
    const last = p.base.slice(-1);
    $$('#fsLetters span').forEach((s) => s.classList.toggle('hot', s.dataset.l === last));
    if (withSound) {
      const my = ++token;
      const sid = t.id.slice(2), pid = p.id.slice(2);
      say('q-' + sid).then(() => { if (my === token) say(`s-${sid}-${pid}`, { el: $('#locA') }); });
    }
  }
  function chipRow(host, list, key, label) {
    list.forEach((it, i) => {
      const b = document.createElement('button');
      b.textContent = label(it);
      if (i === 0) b.classList.add('on');
      b.addEventListener('click', () => {
        $$('button', host).forEach((x) => x.classList.toggle('on', x === b));
        loc[key] = it;
        renderLoc(true);
      });
      host.appendChild(b);
    });
  }
  chipRow($('#locThings'), K.things, 'thing', (t) => `${t.tr} · ${t.ru.toLowerCase()}`);
  chipRow($('#locPlaces'), K.places, 'place', (p) => p.base);
  $('#locA').addEventListener('click', () => say(`s-${loc.thing.id.slice(2)}-${loc.place.id.slice(2)}`, { el: $('#locA') }));
  renderLoc(false);

  /* ================= ФРАЗЫ ================= */
  const pg = $('#phraseGrid');
  K.phrases.forEach((p) => {
    const b = document.createElement('button');
    b.className = 'ph';
    b.dataset.say = p.id;
    b.innerHTML = `<span class="pi"><svg><use href="#play"/></svg></span><b>${esc(p.tr)}</b><span>${esc(p.ru)}</span><small>${esc(p.note)}</small>`;
    pg.appendChild(b);
  });

  /* ================= ТЕСТ ================= */
  const Q0 = [
    { say: 'buzdolabi', q: 'Что ты слышишь?', opts: ['холодильник', 'духовка', 'посудомойка', 'шкаф'], exp: 'buz — лёд, dolap — шкаф. Ледяной шкаф.' },
    { q: 'Тётя Айше принесла тебе менемен. Ты поел. Что сказать?', opts: ['Elinize sağlık!', 'Afiyet olsun!', 'Kolay gelsin!', 'Günaydın!'], exp: '«Здоровья вашим рукам» — тому, кто готовил. Afiyet olsun скажет тебе она.', after: 'elinize-saglik' },
    { q: '«Молоко в холодильнике» — как правильно?', opts: ['Süt buzdolabında.', 'Süt buzdolabıda.', 'Süt buzdolapta.', 'Süt buzdolabda.'], exp: 'buzdolabı уже с окончанием -ı, поэтому перед -da встаёт n: buzdolabı-n-da.', after: 's-sut-buzdolabi' },
    { q: 'Верхний этаж турецкого чайника называется…', opts: ['demlik', 'cezve', 'tencere', 'çaydanlık'], exp: 'Сверху demlik с заваркой. Снизу çaydanlık с кипятком. Не кипяти верхний.', after: 'demlik' },
    { q: 'Tuzluk — это…', opts: ['солонка', 'соль', 'сахарница', 'суп'], exp: 'tuz + luk — «штука для соли». Сахарница — şekerlik.', after: 'l-tuz' },
    { q: 'dolap + «в» = ?', opts: ['dolapta', 'dolapda', 'dolabda', 'dolabta'], exp: 'p — глухая (Fıstıkçı Şahap), значит -ta. Смягчения нет: суффикс начинается с согласной.', after: 'p-dolap' },
    { say: 'davlumbaz', q: 'Что это за предмет?', opts: ['вытяжка', 'кастрюля', 'кран', 'турка'], exp: 'Davlumbaz — вытяжка. Звучит как заклинание, работает как вытяжка.' },
    { q: 'Эмре кричит: «Süt taştı!» Что случилось?', opts: ['Молоко убежало', 'Молоко закончилось', 'Молоко скисло', 'Молоко в шкафу'], exp: 'taşmak — переливаться через край. Беги выключать ocak.', after: 'sut-tasti' }
  ];
  // два вопроса «найди картинку» — в них видны 3D-иконки предметов
  const Q = [...Q0];
  Q.splice(2, 0, { pick: true, say: 'tencere', q: 'Нажми на tencere', opts: ['tencere', 'tava', 'cezve', 'demlik'], exp: 'Tencere — кастрюля. Tava — сковорода, cezve — турка, demlik — заварник.' });
  Q.splice(6, 0, { pick: true, say: 'kesme-tahtasi', q: 'А где kesme tahtası?', opts: ['kesme-tahtasi', 'tabak', 'bicak', 'tezgah'], exp: 'kesme tahtası — «доска для резания». Kesmek — резать.' });
  const THUMB = () => (window.Kitchen3D && window.Kitchen3D.thumbs) || null;
  const qm = $('#quizMain');
  const qs = { i: 0, ok: 0, bad: 0 };
  function qStats() {
    const done = qs.ok + qs.bad;
    $('#qOk').textContent = qs.ok;
    $('#qBad').textContent = qs.bad;
    $('#qLeft').textContent = Q.length - done;
    const pct = done ? Math.round((qs.ok / Q.length) * 100) : 0;
    $('#qPct').textContent = pct + '%';
    $('#qArc').style.strokeDashoffset = 207 - 207 * (done / Q.length);
  }
  function renderQ(auto) {
    const q = Q[qs.i];
    if (q.pick) return renderPick(q, auto);
    const correct = q.opts[0];
    const opts = shuffle(q.opts);
    qm.dataset.pick = '';
    qm.innerHTML = `<p class="q-n">Вопрос ${qs.i + 1} из ${Q.length}</p>
      <h3 class="q-t">${q.say ? `<button class="say-inline big" data-say="${q.say}">▶ слушать</button><br>` : ''}${esc(q.q)}</h3>
      <div class="q-opts">${opts.map((o) => `<button class="q-opt" data-v="${esc(o)}"><span>${esc(o)}</span><span class="mk"></span></button>`).join('')}</div>`;
    $$('.q-opt', qm).forEach((b) => b.addEventListener('click', () => {
      const ok = b.dataset.v === correct;
      $$('.q-opt', qm).forEach((x) => {
        x.disabled = true;
        if (x.dataset.v === correct) { x.classList.add('ok'); $('.mk', x).textContent = '✓'; }
      });
      if (!ok) { b.classList.add('bad'); $('.mk', b).textContent = '✕'; qs.bad++; } else qs.ok++;
      qStats();
      const exp = document.createElement('p');
      exp.className = 'q-exp';
      exp.innerHTML = `<b>${ok ? 'Doğru!' : 'Почти.'}</b> ${esc(q.exp)}`;
      qm.appendChild(exp);
      const nx = document.createElement('button');
      nx.className = 'pill lg q-next';
      nx.textContent = qs.i + 1 < Q.length ? 'Дальше →' : 'Результат →';
      nx.addEventListener('click', () => { qs.i++; qs.i < Q.length ? renderQ(true) : renderFinal(); });
      qm.appendChild(nx);
      if (q.after) say(q.after);
    }));
    if (auto && q.say) say(q.say);
  }
  function answered(ok, q) {
    if (ok) qs.ok++; else qs.bad++;
    qStats();
    const exp = document.createElement('p');
    exp.className = 'q-exp';
    exp.innerHTML = `<b>${ok ? 'Doğru!' : 'Почти.'}</b> ${esc(q.exp)}`;
    qm.appendChild(exp);
    const nx = document.createElement('button');
    nx.className = 'pill lg q-next';
    nx.textContent = qs.i + 1 < Q.length ? 'Дальше →' : 'Результат →';
    nx.addEventListener('click', () => { qs.i++; qs.i < Q.length ? renderQ(true) : renderFinal(); });
    qm.appendChild(nx);
  }
  function renderPick(q, auto) {
    const th = THUMB();
    const opts = shuffle(q.opts);
    qm.innerHTML = `<p class="q-n">Вопрос ${qs.i + 1} из ${Q.length}</p>
      <h3 class="q-t"><button class="say-inline big" data-say="${q.say}">▶ ${esc(WORD[q.say].tr)}</button><br>${esc(q.q)}</h3>
      <div class="q-pick">${opts.map((id) => `<button class="q-tile" data-v="${id}">${th && th[id] ? `<img src="${th[id]}" alt="">` : `<span class="emo">${ICON[id] || '•'}</span>`}<span></span></button>`).join('')}</div>`;
    qm.dataset.pick = '1';
    $$('.q-tile', qm).forEach((b) => b.addEventListener('click', () => {
      const ok = b.dataset.v === q.opts[0];
      $$('.q-tile', qm).forEach((x) => {
        x.disabled = true;
        $('span:last-child', x).textContent = WORD[x.dataset.v].tr;
        if (x.dataset.v === q.opts[0]) x.classList.add('ok');
      });
      if (!ok) b.classList.add('bad');
      say(b.dataset.v);
      answered(ok, q);
    }));
    if (auto) say(q.say);
  }
  function renderFinal() {
    const s = qs.ok;
    const msg = s === Q.length ? 'Идеально. Тётя Айше уже несёт тарелку.' : s >= 6 ? 'Отлично. На кухне ты не пропадёшь.' : s >= 4 ? 'Неплохо. Молоко пока иногда убегает.' : 'Кухня победила. Но это только первый раунд.';
    qm.innerHTML = `<div class="q-final"><p class="q-n">Результат</p><b class="big">${s}/${Q.length}</b><p class="q-t">${msg}</p>
      <p>Это была одна тема из 131. Дальше — больница, ресторан, дорога, банк. Разобраны так же.</p>
      <a class="pill lg" href="#platform">Посмотреть все темы <svg><use href="#arrow"/></svg></a>
      <button class="pill lg light" id="qAgain">Пройти ещё раз</button></div>`;
    $('#qAgain').addEventListener('click', () => { qs.i = 0; qs.ok = 0; qs.bad = 0; qStats(); renderQ(false); });
    if (s >= 6) confetti();
  }
  renderQ(false);
  qStats();

  /* ================= ПЛАТФОРМА ================= */
  // аккордеон: открыт только один
  $$('.adv').forEach((d) => d.addEventListener('toggle', () => {
    if (d.open) $$('.adv').forEach((x) => { if (x !== d) x.open = false; });
  }));

  // видео грузим и играем только в зоне видимости
  const vio = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) {
        if (!v.src) v.src = v.dataset.src;
        const p = v.play(); if (p && p.catch) p.catch(() => {});
      } else v.pause();
    });
  }, { threshold: 0.35 });
  $$('.res-vid video').forEach((v) => vio.observe(v));

  // телефоны: перетаскивание мышью
  const phones = $('#phones');
  let drag = null;
  phones.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') drag = { x: e.clientX, s: phones.scrollLeft }; });
  addEventListener('pointermove', (e) => { if (drag) { phones.scrollLeft = drag.s - (e.clientX - drag.x); } });
  addEventListener('pointerup', () => { drag = null; });

  // калькулятор
  const cm = $('#calcMin');
  function calc() {
    const m = +cm.value;
    const hours = Math.round((m * 365) / 60);
    $('#calcMinV').textContent = m;
    $('#calcHours').textContent = hours;
    $('#calcDays').textContent = Math.round(hours / 8);
    const hs = $('#calcHours').nextElementSibling;
    hs.textContent = `${plural(hours, 'час', 'часа', 'часов')} в год на поиск`;
    $('#calcDays').nextElementSibling.textContent = `${plural(Math.round(hours / 8), 'рабочий день', 'рабочих дня', 'рабочих дней')}`;
  }
  cm.addEventListener('input', calc);
  calc();

  renderHeard(false);

  /* ================= V2: ВИЗУАЛ И АНИМАЦИИ ================= */

  // 3D-иконки из kitchen3d.js
  function applyThumbs(th) {
    if (!th) return;
    const hero = $('#hero3d');
    if (th.__hero && !hero.src) { hero.onload = () => hero.classList.add('ready'); hero.src = th.__hero; }
    $$('.w').forEach((w) => {
      const id = w.dataset.id;
      const ico = $('.ico', w);
      if (th[id] && ico) { const im = new Image(); im.className = 'thumb'; im.alt = ''; im.src = th[id]; ico.replaceWith(im); }
    });
    if (cardId && th[cardId]) { $('#kcImg').src = th[cardId]; $('#kcImg').classList.add('ok'); }
    if (qm.dataset.pick === '1') $$('.q-tile', qm).forEach((t) => {
      const e = $('.emo', t);
      if (e && th[t.dataset.v]) { const im = new Image(); im.src = th[t.dataset.v]; im.alt = ''; e.replaceWith(im); }
    });
  }
  kitchen.addEventListener('kitchen:thumbs', (e) => applyThumbs(e.detail));
  if (THUMB()) applyThumbs(THUMB());

  // заголовки выезжают по словам
  $$('.h2, .h-final').forEach((h) => {
    if (h.querySelector('button')) return;
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    let n = 0;
    [...h.childNodes].forEach((node) => {
      if (node.nodeType !== 3) return;
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span');
        w.className = 'sw';
        w.setAttribute('aria-hidden', 'true');
        w.innerHTML = `<i style="--i:${n++}">${esc(part)}</i>`;
        frag.appendChild(w);
      });
      node.replaceWith(frag);
    });
  });

  // «сейчас звучит»
  const RU = {};
  K.words.forEach((w) => { RU[w.id] = w.ru; RU[w.id + '-ex'] = w.ex[1]; });
  K.phrases.forEach((p) => { RU[p.id] = p.ru; });
  K.lik.forEach((l) => { RU[l.id] = l.ru; });
  K.compounds.forEach((c) => { RU[c.id] = c.ru; });
  Object.assign(RU, { 'x-demlige-koy': 'засыпь заварку в demlik', 'x-demle-15': 'настаивай 15 минут', 'x-bardaga-koy': 'наливай в стаканчик', 'x-tavsan-kani': '«заячья кровь» — идеальный цвет', 'x-acik-mi-koyu-mu': 'светлый или крепкий?', 'x-acik': 'светлый', 'x-koyu': 'крепкий', 'x-mutfak': 'кухня', 'x-kolay': 'турецкий на кухне? легко', 'x-cay': 'чай', 'x-simit': 'бублик с кунжутом', 'x-menemen': 'яичница с помидорами', 'x-lokum': 'рахат-лукум', 'x-kahvalti': 'завтрак', 'x-su-kaynadi': 'вода вскипела!' });
  const now = $('#now');
  let nowT;
  document.addEventListener('say:start', (e) => {
    const id = e.detail.id;
    clearTimeout(nowT);
    $('#nowTr').textContent = TEXT[id] || id;
    $('#nowRu').textContent = RU[id] || '';
    now.classList.add('show');
  });
  document.addEventListener('say:end', () => { clearTimeout(nowT); nowT = setTimeout(() => now.classList.remove('show'), 700); });

  // бегущие строки: скорость зависит от скорости скролла
  const tickers = [];
  function buildRow(row, items) {
    const html = items.map((it) => `<button class="tk" data-say="${it.id}">${esc(it.tr)}<small>${esc(it.ru)}</small></button>`).join('');
    row.innerHTML = html + html;
    tickers.push({ row, dir: +row.dataset.dir, x: 0, w: 0 });
  }
  const wr = shuffle(K.words);
  const rows1 = $$('#ticker1 .tk-row');
  buildRow(rows1[0], wr.slice(0, 13));
  buildRow(rows1[1], [...wr.slice(13), { id: 'x-simit', tr: 'simit', ru: 'бублик' }, { id: 'x-menemen', tr: 'menemen', ru: 'яичница' }]);
  buildRow($('#ticker2 .tk-row'), K.phrases);
  let lastY = scrollY, vel = 0, tPrev = performance.now();
  function tick(t) {
    const dt = Math.min(0.05, (t - tPrev) / 1000); tPrev = t;
    const y = scrollY; vel = vel * 0.9 + (y - lastY) * 0.1; lastY = y;
    tickers.forEach((k) => {
      if (!k.w) k.w = k.row.scrollWidth / 2;
      const sp = reduce ? 0 : (40 + Math.min(900, Math.abs(vel) * 60)) * k.dir * (vel < -0.5 ? -1 : 1);
      k.x -= sp * dt;
      if (k.x <= -k.w) k.x += k.w; if (k.x > 0) k.x -= k.w;
      k.row.style.transform = `translate3d(${k.x}px,0,0)`;
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  addEventListener('resize', () => tickers.forEach((k) => { k.w = 0; }));

  // чайный ритуал: сцена крутится от скролла
  const track = $('#teaTrack');
  const T = {
    flame: $('#tFlame'), bub: $('#tBubbles'), kettle: $('#tKettle'), dem: $('#tDemlik'), lid: $('#tLid'),
    leaves: $$('#tLeaves ellipse'), arc: $('#tTimerArc'), ttxt: $('#tTimerTxt'), timer: $('#tTimer'),
    steam: $('#tSteam1'), stream: $('#tStream'), fill: $('#tFill'), deg: $('#tDegTxt'), degG: $('#tDeg'),
    steps: $$('.tea-step'), dots: $$('.tea-dots i')
  };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (p, a, b) => cl((p - a) / (b - a));
  const mix = (c1, c2, t) => {
    const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const a = h(c1), b = h(c2);
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
  };
  let teaStep = -1;
  function teaScene(p) {
    const s1 = seg(p, 0, 0.25), s2 = seg(p, 0.25, 0.5), s3 = seg(p, 0.5, 0.75), s4 = seg(p, 0.75, 0.98);
    // 1 — огонь и кипение
    const heat = cl(s1 * 1.4) * (1 - s4 * 0.6);
    T.flame.style.transform = `scaleY(${0.3 + heat * 0.9})`;
    T.flame.style.opacity = 0.3 + heat * 0.7;
    T.bub.classList.toggle('on', s1 > 0.55 && s4 < 0.3);
    T.deg.textContent = Math.round(20 + 80 * s1) + '°';
    T.degG.style.opacity = s2 > 0.9 ? 0 : 1;
    const jig = s1 > 0.6 && s1 < 1 && !reduce ? Math.sin(performance.now() / 40) * 1.2 : 0;
    T.kettle.setAttribute('transform', `translate(${jig} 0)`);
    // 2 — крышка и чаинки
    const lidUp = Math.sin(Math.PI * s2);
    T.lid.setAttribute('transform', `translate(${lidUp * 10} ${-lidUp * 34}) rotate(${lidUp * 24} 150 200)`);
    T.leaves.forEach((l, i) => {
      const k = cl((s2 - i * 0.06) * 1.8);
      l.setAttribute('transform', `translate(0 ${k * 190})`);
      l.style.opacity = s2 > 0 && k < 1 ? 1 : 0;
    });
    // 3 — таймер и пар
    T.timer.style.opacity = s3 > 0 || s4 > 0 ? 1 : 0.25;
    T.arc.style.strokeDashoffset = 188.5 * (1 - s3);
    T.ttxt.textContent = Math.round(15 * s3) + "'";
    T.steam.style.opacity = s3 > 0.05 && s4 < 0.2 ? 1 : 0;
    // 4 — наливаем
    const tilt = cl(s4 * 1.6);
    const lift = Math.sin(Math.PI * cl(s4 * 1.25)) * 36;
    T.dem.setAttribute('transform', `translate(${90 * tilt} ${10 * tilt - lift}) rotate(${40 * tilt} 150 224)`);
    const pour = seg(s4, 0.45, 1);
    const level = 62 * pour;
    T.fill.setAttribute('y', 366 - level);
    T.fill.setAttribute('height', level);
    T.fill.style.fill = mix('#5A1A0A', '#B4471F', seg(pour, 0.4, 1));
    T.stream.style.opacity = s4 > 0.45 && s4 < 0.97 ? 1 : 0;
    T.stream.setAttribute('y2', 366 - level);
    // шаги
    const step = p < 0.25 ? 0 : p < 0.5 ? 1 : p < 0.75 ? 2 : 3;
    if (step !== teaStep) { teaStep = step; T.steps.forEach((st, i) => st.classList.toggle('on', i === step)); }
    T.dots.forEach((d, i) => d.style.setProperty('--f', cl(p * 4 - i).toFixed(3)));
  }
  let teaVisible = false;
  new IntersectionObserver(([e]) => { teaVisible = e.isIntersecting; }, { rootMargin: '100px' }).observe(track);
  (function teaLoop() {
    if (teaVisible) {
      const r = track.getBoundingClientRect();
      const p = cl(-r.top / Math.max(1, r.height - innerHeight));
      teaScene(p);
    }
    requestAnimationFrame(teaLoop);
  })();
  teaScene(0);

  // рябь по нажатию
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.pill, .big-btn, .chip, .q-opt, .q-tile, .shade, .w, .ph');
    if (!b || reduce) return;
    const r = b.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 2.2;
    const s = document.createElement('span');
    s.className = 'rp';
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    b.appendChild(s);
    setTimeout(() => s.remove(), 650);
  });

  // магнитики и 3D-чайник следуют за курсором
  const heroEl = $('.hero');
  if (!reduce && matchMedia('(pointer: fine)').matches) {
    heroEl.addEventListener('pointermove', (e) => {
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      $$('.magnet', heroEl).forEach((m, i) => { m.style.setProperty('--px', `${x * (14 + i * 6)}px`); m.style.setProperty('--py', `${y * (14 + i * 6)}px`); });
      $('.hero-3d-wrap').style.translate = `${x * -22}px ${y * -16}px`;
    });
    // «магнитные» большие кнопки
    $$('.pill.lg, .big-btn').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.12}px ${(e.clientY - r.top - r.height / 2) * 0.25}px`;
      });
      b.addEventListener('pointerleave', () => { b.style.translate = ''; });
    });
  }

  // телефоны: coverflow при листании
  function cover() {
    const c = phones.getBoundingClientRect();
    const mid = c.left + c.width / 2;
    $$('.phone', phones).forEach((ph) => {
      const r = ph.getBoundingClientRect();
      const off = cl(((r.left + r.width / 2) - mid) / c.width * 2, -1.5, 1.5);
      ph.style.transform = `perspective(900px) rotateY(${-off * 28}deg) scale(${1 - Math.abs(off) * 0.12}) translateZ(${-Math.abs(off) * 40}px)`;
      ph.style.zIndex = 10 - Math.round(Math.abs(off) * 5);
    });
  }
  if (!reduce) { phones.addEventListener('scroll', () => requestAnimationFrame(cover), { passive: true }); addEventListener('resize', cover); cover(); }

  /* ================= КОНФЕТТИ ================= */
  const cv = $('#confetti');
  function confetti() {
    if (reduce) return;
    const ctx = cv.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const cols = ['#FFE083', '#FDBE9E', '#1A8CFF', '#141414', '#FFFFFF'];
    const ps = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.6,
      vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 16 - 6, r: Math.random() * 6 + 4,
      c: cols[(Math.random() * cols.length) | 0], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3
    }));
    const t0 = performance.now();
    (function fr(t) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach((p) => {
        p.vy += 0.45; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
      });
      if (t - t0 < 3200) requestAnimationFrame(fr); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })(t0);
  }
})();
