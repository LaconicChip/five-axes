/* FIVE AXES — 评分引擎
 * 纯函数，不依赖 DOM，可在 Node 中单测。
 * answers: 长度 = items.length 的数组，值为 1–5 或 null，索引对应 data.items
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FiveEngine = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BANDS = [
    { max: 19, label: '很低' },
    { max: 39, label: '偏低' },
    { max: 59, label: '中等' },
    { max: 79, label: '偏高' },
    { max: 100, label: '很高' }
  ];

  function bandOf(score) {
    for (var i = 0; i < BANDS.length; i++) {
      if (score <= BANDS[i].max) return BANDS[i].label;
    }
    return BANDS[BANDS.length - 1].label;
  }

  function mean(list) {
    if (!list.length) return 0;
    var sum = 0;
    for (var i = 0; i < list.length; i++) sum += list[i];
    return sum / list.length;
  }

  function stdev(list) {
    if (list.length < 2) return 0;
    var m = mean(list);
    var acc = 0;
    for (var i = 0; i < list.length; i++) acc += (list[i] - m) * (list[i] - m);
    return Math.sqrt(acc / list.length);
  }

  /* 把 1–5 的均值映射到 0–100 */
  function toScore(raw) {
    return Math.round(((raw - 1) / 4) * 100);
  }

  function isAnswer(v) {
    return typeof v === 'number' && v >= 1 && v <= 5;
  }

  function score(answers, data, options) {
    options = options || {};
    var items = data.items;
    var axisIds = data.axes.map(function (a) { return a.id; });

    var answered = [];
    var unanswered = [];
    var rawValues = [];

    var collected = {}; // facetId -> [有效分]
    items.forEach(function (it, i) {
      var v = answers ? answers[i] : null;
      if (!isAnswer(v)) {
        unanswered.push(i);
        return;
      }
      answered.push(i);
      rawValues.push(v);
      var val = it.reverse ? 6 - v : v;
      (collected[it.facet] = collected[it.facet] || []).push(val);
    });

    var facetMap = {};
    data.axes.forEach(function (axis) {
      axis.facets.forEach(function (f) {
        var vals = collected[f.id] || [];
        var raw = vals.length ? mean(vals) : null;
        facetMap[f.id] = {
          id: f.id,
          name: f.name,
          axis: axis.id,
          answered: vals.length,
          expected: 2,
          raw: raw,
          score: raw === null ? null : toScore(raw)
        };
      });
    });

    var axes = data.axes.map(function (axis) {
      var list = axis.facets.map(function (f) { return facetMap[f.id].score; }).filter(function (s) {
        return s !== null;
      });
      var s = list.length === axis.facets.length ? Math.round(mean(list)) : null;
      return {
        id: axis.id,
        zh: axis.zh,
        en: axis.en,
        score: s,
        band: s === null ? null : bandOf(s),
        facets: axis.facets.map(function (f) { return facetMap[f.id]; })
      };
    });

    var complete = unanswered.length === 0;
    var ranking = axes.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    var top = ranking[0];
    var bottom = ranking[ranking.length - 1];
    var spread = complete ? top.score - bottom.score : null;

    var archetypeKey;
    if (!complete) {
      archetypeKey = null;
    } else if (spread < 10) {
      archetypeKey = 'EQUAL';
    } else {
      var pair = [top.id, ranking[1].id].sort(function (a, b) {
        return axisIds.indexOf(a) - axisIds.indexOf(b);
      });
      archetypeKey = pair.join('');
    }
    var archetype = archetypeKey ? data.archetypes[archetypeKey] || null : null;

    var allFacets = Object.keys(facetMap).map(function (k) { return facetMap[k]; }).filter(function (f) {
      return f.score !== null;
    });
    var facetRanking = allFacets.slice().sort(function (a, b) { return b.score - a.score; });

    var answeredCount = answered.length;
    var durationMs = typeof options.durationMs === 'number' ? options.durationMs : null;
    var avgSec = durationMs !== null && answeredCount ? durationMs / 1000 / answeredCount : null;
    var sd = stdev(rawValues);
    var neutralRatio = rawValues.length ? rawValues.filter(function (v) { return v === 3; }).length / rawValues.length : 0;

    var flags = [];
    if (rawValues.length >= 10 && sd < 0.55) {
      flags.push({
        code: 'flat',
        title: '作答过于集中',
        text: '40 个答案的标准差只有 ' + sd.toFixed(2) + '，几乎落在同一档。如果这就是真实的你，没有问题；如果是快速点过去的，结果会失真。'
      });
    }
    if (rawValues.length >= 10 && neutralRatio > 0.5) {
      flags.push({
        code: 'neutral',
        title: '「说不清」占了多数',
        text: Math.round(neutralRatio * 100) + '% 的题选了中间项。中间项过多会削弱所有轴的区分度，结果会向 50 收拢。'
      });
    }
    if (avgSec !== null && avgSec < 1.5) {
      flags.push({
        code: 'fast',
        title: '作答速度偏快',
        text: '平均每题 ' + avgSec.toFixed(1) + ' 秒，通常不足以读完题干。慢一点，分数会更像你。'
      });
    }
    if (!complete) {
      flags.push({
        code: 'incomplete',
        title: '尚未答完',
        text: '还有 ' + unanswered.length + ' 题没有作答，无法生成完整档案。'
      });
    }

    return {
      complete: complete,
      answeredCount: answeredCount,
      unanswered: unanswered,
      facetMap: facetMap,
      facetRanking: facetRanking,
      axes: axes,
      ranking: complete ? ranking : [],
      top: complete ? top : null,
      bottom: complete ? bottom : null,
      spread: spread,
      archetypeKey: archetypeKey,
      archetype: archetype,
      quality: {
        durationMs: durationMs,
        avgSec: avgSec,
        stdev: sd,
        neutralRatio: neutralRatio,
        flags: flags
      }
    };
  }

  return {
    score: score,
    bandOf: bandOf,
    toScore: toScore,
    BANDS: BANDS
  };
});
