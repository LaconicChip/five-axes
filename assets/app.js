/* FIVE AXES — 界面与交互
 * 无依赖，原生 DOM。状态机：cover → quiz → report
 */
(function () {
  'use strict';

  var D = window.FIVE_DATA;
  var E = window.FiveEngine;
  var TOTAL = D.order.length;
  var AUTO_MS = 1250;
  var KEY_SESSION = 'five-axes/session/v1';
  var KEY_HISTORY = 'five-axes/history/v1';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var state = {
    view: 'cover',
    pos: 0,
    answers: new Array(D.items.length).fill(null),
    startedAt: null,
    auto: true,
    finished: false,
    timer: null
  };

  /* ── 工具 ─────────────────────────────────────────── */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function axisOf(id) {
    for (var i = 0; i < D.axes.length; i++) if (D.axes[i].id === id) return D.axes[i];
    return null;
  }
  function facetOf(id) {
    for (var i = 0; i < D.axes.length; i++) {
      var fs = D.axes[i].facets;
      for (var j = 0; j < fs.length; j++) if (fs[j].id === id) return fs[j];
    }
    return null;
  }
  function fmtDate(iso) {
    var d = iso ? new Date(iso) : new Date();
    return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fmtDuration(ms) {
    if (ms === null || ms === undefined || ms < 0) return '未记录';
    var s = Math.round(ms / 1000);
    return Math.floor(s / 60) + ' 分 ' + pad(s % 60) + ' 秒';
  }
  function live(msg) {
    var el = $('#live');
    if (el) el.textContent = msg;
  }

  /* ── 存储 ─────────────────────────────────────────── */
  function saveSession() {
    if (state.finished) return;
    try {
      localStorage.setItem(KEY_SESSION, JSON.stringify({
        answers: state.answers,
        pos: state.pos,
        startedAt: state.startedAt,
        auto: state.auto
      }));
    } catch (e) { /* 隐私模式下忽略 */ }
  }
  function readSession() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY_SESSION) || 'null');
      if (!s || !Array.isArray(s.answers) || s.answers.length !== D.items.length) return null;
      return s;
    } catch (e) { return null; }
  }
  function readHistory() {
    try {
      var list = JSON.parse(localStorage.getItem(KEY_HISTORY) || '[]');
      return Array.isArray(list) ? list.filter(function (h) { return h && Array.isArray(h.answers); }) : [];
    } catch (e) { return []; }
  }
  function pushHistory(entry) {
    try {
      var list = readHistory();
      list.unshift(entry);
      localStorage.setItem(KEY_HISTORY, JSON.stringify(list.slice(0, 5)));
    } catch (e) { /* 忽略配额错误 */ }
  }

  /* ── 视图切换 ─────────────────────────────────────── */
  function show(view) {
    state.view = view;
    ['cover', 'quiz', 'report'].forEach(function (v) {
      var el = $('#view-' + v);
      if (el) el.hidden = v !== view;
    });
    clearAuto();
    document.body.classList.toggle('is-quizzing', view === 'quiz');
    if (view === 'cover') updateResume();
    window.scrollTo(0, 0);
  }

  function updateResume() {
    var btn = $('#resumeBtn');
    if (!btn) return;
    var s = readSession();
    var done = s ? s.answers.filter(Boolean).length : 0;
    if (done > 0) {
      btn.hidden = false;
      btn.textContent = '继续上次（' + done + ' / ' + TOTAL + '）';
    } else {
      btn.hidden = true;
    }
  }

  /* ── 封面 ─────────────────────────────────────────── */
  function renderAxisTable() {
    $('#axisTable').innerHTML = D.axes.map(function (a) {
      return '<div class="axis-row"><span class="id">' + a.id + '</span>' +
        '<span class="zh">' + esc(a.zh) + '</span>' +
        '<span class="en">' + a.en + '</span>' +
        '<span class="line">' + esc(a.line) + '</span></div>';
    }).join('');
  }

  function renderHistory() {
    var list = readHistory();
    var el = $('#history');
    if (!list.length) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = '<div class="history-head"><span class="label">最近的档案 / HISTORY</span>' +
      '<span class="label">最近 ' + list.length + ' 份</span></div>' +
      list.map(function (h, i) {
        var r = E.score(h.answers, D, {});
        var name = r.archetype ? r.archetype.name : '未完成';
        var line = r.complete ? r.axes.map(function (a) { return a.id + a.score; }).join(' · ') : '';
        return '<div class="history-row"><span class="mono">' + fmtDate(h.at) + '</span>' +
          '<span class="history-name">' + esc(name) + '<em>' + line + '</em></span>' +
          '<button class="ghost sm" type="button" data-action="open-history" data-i="' + i + '">查看</button></div>';
      }).join('');
  }

  /* ── 答题 ─────────────────────────────────────────── */
  function buildScale() {
    $('#scale').innerHTML = D.scale.map(function (s) {
      return '<button type="button" role="radio" aria-checked="false" tabindex="-1" data-v="' + s.value + '" ' +
        'aria-label="' + s.value + ' ' + esc(s.label) + '">' +
        '<span class="num">' + s.value + '</span><span class="word">' + esc(s.label) + '</span></button>';
    }).join('');
  }

  function buildRail() {
    var html = '';
    for (var i = 0; i < TOTAL; i++) {
      html += '<button class="sheet-cell" type="button" data-pos="' + i + '" aria-label="第 ' + (i + 1) + ' 题"></button>';
    }
    $('#railSheet').innerHTML = html;
  }

  function paintScale(v) {
    $$('#scale button').forEach(function (btn) {
      var on = Number(btn.dataset.v) === v;
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
      btn.tabIndex = on ? 0 : -1;
    });
    if (!v) {
      var first = $('#scale button');
      if (first) first.tabIndex = 0;
    }
  }

  function paintRail() {
    $$('#railSheet .sheet-cell').forEach(function (btn, i) {
      var answered = !!state.answers[D.order[i]];
      btn.dataset.state = i === state.pos ? 'current' : (answered ? 'done' : '');
      btn.setAttribute('aria-current', i === state.pos ? 'true' : 'false');
      btn.setAttribute('aria-label', '第 ' + (i + 1) + ' 题，' + (answered ? '已作答' : '未作答'));
    });
  }

  function paintProgress() {
    var done = state.answers.filter(function (v) { return !!v; }).length;
    $('#progressFill').style.width = (done / TOTAL * 100) + '%';
    $('#progressBar').setAttribute('aria-valuenow', String(done));
  }

  function renderQuestion() {
    var idx = D.order[state.pos];
    var item = D.items[idx];
    var axis = axisOf(item.axis);
    var facet = facetOf(item.facet);

    $('#railNum').textContent = pad(state.pos + 1);
    $('#quizCount').textContent = pad(state.pos + 1) + ' / ' + pad(TOTAL);
    $('#axisTag').textContent = axis.id + ' · ' + axis.zh + ' / ' + facet.name;
    $('#statement').textContent = item.text;

    paintScale(state.answers[idx]);
    paintRail();
    paintProgress();

    $('#prevBtn').disabled = state.pos === 0;
    $('#note').hidden = true;
    $('#note').classList.remove('in');
    if (state.answers[idx]) revealNote(false);
    live('第 ' + (state.pos + 1) + ' 题，共 ' + TOTAL + ' 题。');
  }

  function revealNote(animate) {
    var idx = D.order[state.pos];
    var item = D.items[idx];
    var facet = facetOf(item.facet);
    var note = $('#note');

    $('#noteFacet').textContent = '面向 · ' + facet.name + (item.reverse ? ' · 反向题' : '');
    $('#noteH').lastElementChild.textContent = facet.h;
    $('#noteL').lastElementChild.textContent = facet.l;
    $('#noteRev').hidden = !item.reverse;

    note.hidden = false;
    note.classList.remove('in');
    if (animate) void note.offsetWidth;
    note.classList.add('in');
  }

  function select(v) {
    var idx = D.order[state.pos];
    var first = state.answers[idx] === null;
    state.answers[idx] = v;
    paintScale(v);
    paintRail();
    paintProgress();
    revealNote(true);
    saveSession();
    live('第 ' + (state.pos + 1) + ' 题，已选「' + D.scale[v - 1].label + '」');
    if (first && state.auto) startAuto();
  }

  function startAuto() {
    clearAuto();
    if (!state.auto) return;
    var bar = $('#noteTimer');
    if (!bar) return;
    bar.style.transition = 'none';
    bar.style.width = '0%';
    void bar.offsetWidth;
    bar.style.transition = 'width ' + AUTO_MS + 'ms linear';
    bar.style.width = '100%';
    state.timer = setTimeout(function () {
      state.timer = null;
      next();
    }, AUTO_MS);
  }

  function clearAuto() {
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    var bar = $('#noteTimer');
    if (bar) { bar.style.transition = 'none'; bar.style.width = '0%'; }
  }

  function pauseAuto() {
    if (!state.timer) return;
    clearTimeout(state.timer);
    state.timer = null;
    var bar = $('#noteTimer');
    var note = $('#note');
    if (bar && note) {
      var w = bar.getBoundingClientRect().width;
      var total = note.getBoundingClientRect().width || 1;
      bar.style.transition = 'none';
      bar.style.width = (w / total * 100) + '%';
    }
  }

  function firstUnanswered() {
    for (var i = 0; i < TOTAL; i++) {
      if (!state.answers[D.order[i]]) return i;
    }
    return -1;
  }

  function next() {
    clearAuto();
    if (state.pos < TOTAL - 1) {
      state.pos++;
      saveSession();
      renderQuestion();
      return;
    }
    var missing = firstUnanswered();
    if (missing === -1) { finish(); return; }
    state.pos = missing;
    saveSession();
    renderQuestion();
    notice('还有题目没答，已跳到第 ' + (missing + 1) + ' 题。');
  }

  function prev() {
    clearAuto();
    if (state.pos === 0) return;
    state.pos--;
    saveSession();
    renderQuestion();
  }

  function jumpTo(i) {
    clearAuto();
    if (i < 0 || i >= TOTAL) return;
    state.pos = i;
    saveSession();
    renderQuestion();
  }

  var toastTimer = null;
  var currentReport = null;

  function notice(msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 3200);
  }

  function finish() {
    clearAuto();
    var missing = firstUnanswered();
    if (missing !== -1) {
      jumpTo(missing);
      notice('第 ' + (missing + 1) + ' 题还没答，答完就能交卷。');
      return;
    }
    var durationMs = state.startedAt ? Date.now() - state.startedAt : null;
    var res = E.score(state.answers, D, { durationMs: durationMs });
    pushHistory({ at: new Date().toISOString(), answers: state.answers.slice(), durationMs: durationMs });
    state.finished = true;
    try { localStorage.removeItem(KEY_SESSION); } catch (e) { /* 忽略 */ }
    renderReport(res, { at: new Date().toISOString(), durationMs: durationMs, demo: false, answers: state.answers.slice() });
    show('report');
    renderHistory();
    /* 会话已归档，答题状态清空，避免「开始作答」再弹一次确认 */
    state.answers = new Array(D.items.length).fill(null);
  }

  /* ── 档案 ─────────────────────────────────────────── */
  function sec(n, title, intro, body) {
    return '<section class="sec" id="s' + n + '">' +
      '<div class="sec-head"><span class="sec-num">' + n + '</span>' +
      '<div><h2 class="sec-title">' + title + '</h2>' +
      (intro ? '<p class="sec-intro">' + intro + '</p>' : '') +
      '</div></div>' + body + '</section>';
  }

  function scoreCells(res) {
    return '<div class="score-row">' + res.axes.map(function (a) {
      return '<div class="score-cell"><div class="k">' + esc(a.zh) + '</div>' +
        '<div class="v">' + a.score + '</div>' +
        '<div class="b"><i style="width:' + a.score + '%"></i></div>' +
        '<div class="band">' + a.band + '</div></div>';
    }).join('') + '</div>';
  }

  function axisBlock(axis) {
    var main = axis.score >= 50 ? axis.high : axis.low;
    var opp = axis.score >= 50 ? axis.low : axis.high;
    var sorted = axis.facets.slice().sort(function (a, b) { return b.score - a.score; });
    var bestScore = sorted[0].score;
    var bestCount = axis.facets.filter(function (f) { return f.score === bestScore; }).length;
    var hiId = bestCount === 1 && bestScore >= 60 ? sorted[0].id : null;

    var facets = axis.facets.map(function (f) {
      var hi = f.id === hiId;
      return '<div class="facet-row" data-hi="' + (hi ? '1' : '0') + '">' +
        '<span class="fn">' + esc(f.name) + '</span>' +
        '<span class="fb"><i style="width:' + f.score + '%"></i></span>' +
        '<span class="fv">' + f.score + '</span></div>';
    }).join('');

    return '<div class="axis-block"><div>' +
      '<div class="axis-head"><span class="id">' + axis.id + '</span>' +
      '<span class="zh">' + esc(axis.zh) + '</span><span class="en">' + axis.en + '</span></div>' +
      '<div class="axis-score"><b>' + axis.score + '</b><span>' + axis.band + ' / 100</span></div>' +
      '<div class="ruler"><i style="left:calc(' + axis.score + '% - ' + (axis.score / 10).toFixed(1) + 'px)"></i></div>' +
      '<div class="ruler-labels"><span>0 低</span><span>50 中点</span><span>100 高</span></div>' +
      '<p class="axis-copy">' + esc(main) +
      '<span class="opp">另一侧是：' + esc(opp) + '</span></p>' +
      '</div><div><div class="facet-list">' + facets + '</div></div></div>';
  }

  function reviewRows(answers) {
    return '<div class="review-head"><span>#</span><span>题目</span>' +
      '<span class="rh-f">面向</span><span>你的选择</span></div>' +
      D.order.map(function (itemIdx, i) {
        var item = D.items[itemIdx];
        var facet = facetOf(item.facet);
        var v = answers[itemIdx] || 0;
        var dots = '';
        for (var k = 1; k <= 5; k++) {
          dots += '<i class="' + (k === v ? 'on' : '') + (k === v && item.reverse ? ' rev' : '') + '"></i>';
        }
        return '<div class="review-row"><span class="ri">' + pad(i + 1) + '</span>' +
          '<span class="rt">' + esc(item.text) + (item.reverse ? '<span class="rev-tag">反向</span>' : '') + '</span>' +
          '<span class="rf">' + esc(facet.name) + '</span>' +
          '<span class="rv" aria-label="选择 ' + v + '">' + dots + '</span></div>';
      }).join('');
  }

  function renderReport(res, meta) {
    if (!meta) meta = {};
    var answers = meta.answers || state.answers;
    currentReport = { res: res, answers: answers, demo: !!meta.demo };

    /* 引擎只算分，文案挂在 data 的轴定义上，这里合并一次（ranking/top 与 axes 是同一批对象） */
    res.axes.forEach(function (a) {
      var d = axisOf(a.id);
      if (!d) return;
      a.line = d.line; a.high = d.high; a.low = d.low;
      a.cost = d.cost; a.work = d.work; a.rel = d.rel; a.stress = d.stress;
    });

    var top = res.top;
    var bottom = res.bottom;
    var arch = res.archetype;
    var facets = res.facetRanking;
    var topFacet = facets[0];
    var lowFacet = facets[facets.length - 1];
    var second = res.ranking[1];
    var bottom2 = res.ranking[res.ranking.length - 2];

    var index = [
      ['01', '总览'], ['02', '五维细读'], ['03', '优势与盲点'],
      ['04', '三种场景'], ['05', '方法与局限'], ['06', '逐题回顾']
    ];
    $('#reportIndex').innerHTML = index.map(function (s) {
      return '<a href="#s' + s[0] + '"><span class="n">' + s[0] + '</span><span>' + s[1] + '</span></a>';
    }).join('');

    var reverseNos = D.items.map(function (it, i) {
      return it.reverse ? D.order.indexOf(i) + 1 : 0;
    }).filter(Boolean);

    var head = '<header class="report-head">' +
      (meta.demo ? '<p class="demo-banner">示例档案 · 由固定答案生成，不是你的结果</p>' : '') +
      '<div class="report-eyebrow"><span class="label">人格档案 / PROFILE</span>' +
      '<span class="mono">' + fmtDate(meta.at) + '</span></div>' +
      '<h1 class="report-title">' + esc(arch.name) + '</h1>' +
      '<p class="report-sub">' + esc(arch.blurb) + '</p>' +
      '<p class="report-note">主调是' + esc(top.zh) + ' ' + top.score + '，最低的是' + esc(bottom.zh) + ' ' + bottom.score +
      '，两端相差 ' + res.spread + ' 分。' + esc(arch.risk) + '</p>' +
      '<div class="report-actions">' +
      '<button class="ghost sm" type="button" data-action="print">打印 / 存为 PDF</button>' +
      (meta.demo
        ? '<button class="ghost sm" type="button" data-action="home">回到封面</button>' +
          '<button class="ghost sm" type="button" data-action="start">开始我的测试</button>'
        : '<button class="ghost sm" type="button" data-action="copy">复制摘要</button>' +
          '<button class="ghost sm" type="button" data-action="retest">重测</button>' +
          '<button class="ghost sm" type="button" data-action="home">回到封面</button>') +
      '</div></header>';

    var overview = sec('01', '总览',
      '分数是你在本量表内的位置，0–100，50 是这条轴的中点。五条轴没有好坏，只有代价不同的位置。',
      scoreCells(res));

    var detail = sec('02', '五维细读',
      '每条轴下面拆成 4 个面向，每个面向 2 题。这条轴上得分最高的那个面向会被标红——如果几个面向并列，就不标，免得替你选一个。',
      D.axes.map(function (a) {
        var found = res.axes.filter(function (x) { return x.id === a.id; })[0];
        return axisBlock(found);
      }).join(''));

    var strength1 = { text: top.high, src: top.zh + ' ' + top.score };
    var strength2 = { text: second.high, src: second.zh + ' ' + second.score };
    var strength3 = topFacet.id !== lowFacet.id
      ? { text: facetOf(topFacet.id).h, src: '面向 · ' + topFacet.name + ' ' + topFacet.score }
      : { text: '四十个答案几乎落在同一档，脸谱化的描述对你没什么用——这也是一个信息。', src: '一致性提示' };

    var blind1 = { text: bottom.low, src: bottom.zh + ' ' + bottom.score };
    var blind2 = { text: top.cost, src: top.zh + ' · 过度的代价' };
    var blind3 = topFacet.id !== lowFacet.id
      ? { text: facetOf(lowFacet.id).l, src: '面向 · ' + lowFacet.name + ' ' + lowFacet.score }
      : { text: bottom2.low, src: bottom2.zh + ' ' + bottom2.score };

    function duoItem(item, i) {
      return '<div class="duo-item"><span class="n">' + pad(i + 1) + '</span><div>' +
        '<p>' + esc(item.text) + '</p><span class="src">' + esc(item.src) + '</span></div></div>';
    }

    var duo = sec('03', '优势与盲点',
      '左边是你现在就可以依赖的东西，右边是同一套特质在别处开出的账单。这两列不是夸奖与批评，是同一件事的两面。',
      '<div class="duo">' +
      '<div class="duo-col"><span class="label">可以依赖 / STRENGTHS</span>' +
      [strength1, strength2, strength3].map(duoItem).join('') + '</div>' +
      '<div class="duo-col"><span class="label">要留意 / BLIND SPOTS</span>' +
      [blind1, blind2, blind3].map(duoItem).join('') + '</div>' +
      '</div>');

    var scenes = [['工作', 'work'], ['关系', 'rel'], ['压力', 'stress']].map(function (s) {
      return '<div class="scene-block"><h3>' + s[0] + '</h3>' +
        '<p><span class="tag">' + esc(top.zh) + ' ' + top.score + '</span>' + esc(top[s[1]]) + '</p>' +
        '<p><span class="tag">' + esc(bottom.zh) + ' ' + bottom.score + '</span>' + esc(bottom[s[1]]) + '</p></div>';
    }).join('');

    var scene = sec('04', '三种场景',
      '同样两条轴，在三个场合里表现不一样。先读高分那条，再读最低那条——后者通常是你更需要提前安排的。',
      '<div class="scene">' + scenes + '</div>');

    var flags = res.quality.flags.map(function (f) {
      return '<p class="flag"><b>' + esc(f.title) + '</b>　' + esc(f.text) + '</p>';
    }).join('');

    var method = sec('05', '方法与局限',
      '把方法写出来，是为了让你知道这份档案能推到多远。',
      '<div class="method">' +
      '<p>共 40 个陈述句，覆盖 5 条轴；每条轴拆 4 个面向，每个面向 2 题。你在 1–5 之间选择认同程度。' +
      '其中 ' + reverseNos.length + ' 题反向计分（第 ' + reverseNos.join('、') + ' 题）：选「同意」计入的是相反方向，用来抵消一路点头的作答习惯。</p>' +
      '<p>面向分 = 两题均值映射到 0–100；轴分 = 四个面向分的平均。所有分数都是你在本量表内的相对位置，不是人群百分位——' +
      '「开放性 78」不代表你比 78% 的人更开放。</p>' +
      '<ul>' +
      '<li><span>作答用时</span><span>' + fmtDuration(meta.durationMs) + (res.quality.avgSec ? '，平均每题 ' + res.quality.avgSec.toFixed(1) + ' 秒' : '') + '</span></li>' +
      '<li><span>作答一致性</span><span>标准差 ' + res.quality.stdev.toFixed(2) + '（数值越小说明你在不同题上的立场越整齐）</span></li>' +
      '<li><span>中间项比例</span><span>' + Math.round(res.quality.neutralRatio * 100) + '% 的题选了「说不清」</span></li>' +
      '<li><span>完成情况</span><span>' + res.answeredCount + ' / ' + TOTAL + ' 题</span></li>' +
      '</ul>' + flags +
      '<p>局限：每个面向只有 2 题，误差不小——趋势可看，精确到个位不可信。这不是临床诊断，也不构成医疗建议；' +
      '如果你正被某些状态持续困扰，专业人士比任何量表都更有用。</p>' +
      '</div>');

    var review = sec('06', '逐题回顾',
      '这是你刚才走过的 40 题。红点表示该题反向计分：你选的「同意」在计分时被反转了。',
      '<div class="review">' + reviewRows(answers) + '</div>');

    $('#reportBody').innerHTML = head + overview + detail + duo + scene + method + review;
    observeSections();
  }

  function observeSections() {
    var links = $$('#reportIndex a');
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          a.setAttribute('aria-current', a.getAttribute('href') === '#' + en.target.id ? 'true' : 'false');
        });
      });
    }, { rootMargin: '-15% 0px -65% 0px' });
    $$('#reportBody .sec').forEach(function (s) { io.observe(s); });
  }

  /* ── 示例档案 ─────────────────────────────────────── */
  function demoAnswers() {
    var base = { O: 4.2, C: 3.4, E: 2.1, A: 3.2, S: 2.6 };
    var seed = 20261018;
    function rnd() {
      /* 32 位 LCG：用 Math.imul 保证不丢精度，示例档案每次生成同一套答案 */
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    return D.items.map(function (it) {
      var v = Math.round(base[it.axis] + (rnd() - 0.5) * 2.6);
      return Math.max(1, Math.min(5, v));
    });
  }

  function openDemo() {
    var answers = demoAnswers();
    var res = E.score(answers, D, { durationMs: 9 * 60 * 1000 + 41000 });
    renderReport(res, { at: new Date().toISOString(), durationMs: 9 * 60 * 1000 + 41000, demo: true, answers: answers });
    show('report');
  }

  function openHistory(i) {
    var list = readHistory();
    var h = list[i];
    if (!h) return;
    var res = E.score(h.answers, D, { durationMs: h.durationMs });
    if (!res.complete) { notice('那份档案没有答完。'); return; }
    renderReport(res, { at: h.at, durationMs: h.durationMs, demo: false, answers: h.answers });
    show('report');
  }

  /* ── 动作 ─────────────────────────────────────────── */
  function startFresh(force) {
    var done = state.answers.filter(Boolean).length;
    if (!force && done > 0 && !window.confirm('重新开始会清空上一次的作答，确定吗？')) return;
    state.answers = new Array(D.items.length).fill(null);
    state.pos = 0;
    state.startedAt = Date.now();
    state.finished = false;
    saveSession();
    show('quiz');
    renderQuestion();
    $('#statement').focus();
  }

  function resume() {
    var s = readSession();
    if (s) {
      state.answers = s.answers;
      state.pos = Math.max(0, Math.min(TOTAL - 1, s.pos || 0));
      state.startedAt = s.startedAt || Date.now();
      state.auto = s.auto !== false;
      $('#autoBtn').setAttribute('aria-pressed', state.auto ? 'true' : 'false');
      $('#autoBtn').textContent = '自动翻页 ' + (state.auto ? '开' : '关');
    }
    show('quiz');
    renderQuestion();
  }

  function copySummary() {
    if (!currentReport) { notice('还没有可复制的档案。'); return; }
    var res = currentReport.res;
    if (!res.complete) { notice('先答完才能复制摘要。'); return; }
    var text = 'FIVE AXES · 大五人格\n' +
      res.axes.map(function (a) { return a.zh + ' ' + a.score; }).join(' · ') + '\n' +
      '类型：' + res.archetype.name + ' —— ' + res.archetype.blurb;
    var done = function () { notice('摘要已复制。'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { notice('复制失败，请手动选择文本。'); }
    document.body.removeChild(ta);
  }

  /* ── 事件 ─────────────────────────────────────────── */
  function bind() {
    document.addEventListener('click', function (e) {
      var act = e.target.closest('[data-action]');
      if (act) {
        var a = act.getAttribute('data-action');
        if (a === 'start') startFresh(false);
        else if (a === 'resume') resume();
        else if (a === 'demo') openDemo();
        else if (a === 'home') show('cover');
        else if (a === 'next') next();
        else if (a === 'prev') prev();
        else if (a === 'finish') finish();
        else if (a === 'print') window.print();
        else if (a === 'copy') copySummary();
        else if (a === 'retest') startFresh(true);
        else if (a === 'open-history') openHistory(Number(act.dataset.i));
        else if (a === 'auto') {
          state.auto = !state.auto;
          act.setAttribute('aria-pressed', state.auto ? 'true' : 'false');
          act.textContent = '自动翻页 ' + (state.auto ? '开' : '关');
          if (!state.auto) clearAuto();
          else if (state.answers[D.order[state.pos]]) startAuto();
          saveSession();
        }
        return;
      }

      var cell = e.target.closest('.sheet-cell');
      if (cell) { jumpTo(Number(cell.dataset.pos)); return; }

      var opt = e.target.closest('#scale button');
      if (opt) { select(Number(opt.dataset.v)); return; }

      if (e.target.closest('#nextBtn')) { next(); return; }
      if (e.target.closest('#prevBtn')) { prev(); return; }
    });

    document.addEventListener('keydown', function (e) {
      if (state.view !== 'quiz') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      var onButton = e.target.closest('button');
      if (onButton && !e.target.closest('#scale') && (e.key === 'Enter' || e.key === ' ')) return;

      if (e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        select(Number(e.key));
        return;
      }
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        next();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    });

    var note = $('#note');
    note.addEventListener('pointerenter', pauseAuto);
    note.addEventListener('pointerleave', function () {
      if (state.auto && state.answers[D.order[state.pos]]) startAuto();
    });

    $('#railSheet').addEventListener('keydown', function (e) {
      var cell = e.target.closest('.sheet-cell');
      if (!cell) return;
      var i = Number(cell.dataset.pos);
      if (e.key === 'ArrowRight') { e.preventDefault(); var n = $('#railSheet').children[Math.min(TOTAL - 1, i + 1)]; n && n.focus(); jumpTo(Math.min(TOTAL - 1, i + 1)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); var p = $('#railSheet').children[Math.max(0, i - 1)]; p && p.focus(); jumpTo(Math.max(0, i - 1)); }
    });

    window.addEventListener('beforeunload', saveSession);
  }

  /* ── 启动 ─────────────────────────────────────────── */
  function init() {
    renderAxisTable();
    buildScale();
    buildRail();
    renderHistory();

    var s = readSession();
    if (s) {
      state.answers = s.answers;
      state.pos = Math.max(0, Math.min(TOTAL - 1, s.pos || 0));
      state.startedAt = s.startedAt || null;
      state.auto = s.auto !== false;
    }
    updateResume();
    $('#autoBtn').setAttribute('aria-pressed', state.auto ? 'true' : 'false');
    $('#autoBtn').textContent = '自动翻页 ' + (state.auto ? '开' : '关');

    bind();

    var demo = new URLSearchParams(location.search).get('demo');
    if (demo) openDemo();
    else show('cover');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
