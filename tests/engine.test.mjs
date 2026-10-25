import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';

const require = createRequire(import.meta.url);
const D = require('../assets/data.js');
const E = require('../assets/engine.js');

const N = D.items.length;

function fill(v) {
  return new Array(N).fill(v);
}

function byAxisBase(map) {
  return D.items.map((it) => map[it.axis]);
}

test('题库结构：40 题 / 5 轴 / 4 面向 / 每面向 2 题', () => {
  assert.equal(N, 40);
  assert.equal(D.axes.length, 5);
  const facetCount = {};
  D.axes.forEach((a) => {
    assert.equal(a.facets.length, 4, a.zh + ' 应有 4 个面向');
    a.facets.forEach((f) => { facetCount[f.id] = 0; });
  });
  D.items.forEach((it) => {
    assert.ok(facetCount[it.facet] !== undefined, '未知面向: ' + it.facet);
    facetCount[it.facet]++;
  });
  Object.keys(facetCount).forEach((k) => assert.equal(facetCount[k], 2, k + ' 应有 2 题'));
});

test('题干不重复，反向题恰好 4 道', () => {
  const texts = D.items.map((i) => i.text);
  assert.equal(new Set(texts).size, N);
  assert.equal(D.items.filter((i) => i.reverse).length, 4);
});

test('呈现顺序是 0..39 的排列，且不出现连续三题同轴', () => {
  assert.equal(D.order.length, N);
  assert.deepEqual(D.order.slice().sort((a, b) => a - b), Array.from({ length: N }, (_, i) => i));
  let run = 1;
  for (let i = 1; i < D.order.length; i++) {
    run = D.items[D.order[i]].axis === D.items[D.order[i - 1]].axis ? run + 1 : 1;
    assert.ok(run < 3, '第 ' + (i + 1) + ' 题出现连续同轴');
  }
});

test('全选 5：含反向题的轴被压到 75，其余 100', () => {
  const r = E.score(fill(5), D, {});
  const map = Object.fromEntries(r.axes.map((a) => [a.id, a.score]));
  assert.equal(map.O, 100);
  assert.equal(map.E, 100);
  assert.equal(map.A, 100);
  assert.equal(map.C, 75, '尽责性含两道反向题');
  assert.equal(map.S, 75, '稳定性含两道反向题');
  assert.equal(r.spread, 25);
  assert.notEqual(r.archetypeKey, 'EQUAL');
  assert.equal(r.complete, true);
});

test('全选 1：含反向题的轴为 25，其余 0', () => {
  const r = E.score(fill(1), D, {});
  const map = Object.fromEntries(r.axes.map((a) => [a.id, a.score]));
  assert.equal(map.O, 0);
  assert.equal(map.C, 25);
  assert.equal(map.S, 25);
});

test('反向计分：全选 1 时，含反向题的面向落在 50，其余 0', () => {
  const r = E.score(fill(1), D, {});
  const reverseFacets = new Set(D.items.filter((i) => i.reverse).map((i) => i.facet));
  assert.deepEqual([...reverseFacets].sort(), ['C1', 'C2', 'S2', 'S4']);
  Object.values(r.facetMap).forEach((f) => {
    const expect = reverseFacets.has(f.id) ? 50 : 0;
    assert.equal(f.score, expect, f.id + ' 期望 ' + expect);
  });
});

test('全选 3 → 50 分，并给出「集中」「中间项」提示', () => {
  const r = E.score(fill(3), D, {});
  r.axes.forEach((a) => assert.equal(a.score, 50));
  const codes = r.quality.flags.map((f) => f.code);
  assert.ok(codes.includes('flat'));
  assert.ok(codes.includes('neutral'));
  assert.equal(r.quality.neutralRatio, 1);
});

test('类型判定取最高的两条轴，键序按 O-C-E-A-S', () => {
  const a = E.score(byAxisBase({ O: 5, C: 2, E: 4, A: 3, S: 1 }), D, {});
  assert.deepEqual(a.ranking.map((x) => x.id), ['O', 'E', 'A', 'C', 'S']);
  assert.equal(a.archetypeKey, 'OE');
  assert.equal(a.archetype.name, '点火者');

  // E 最高、C 第二：键仍写作 CE，证明键序不随排名颠倒
  const b = E.score(byAxisBase({ O: 1, C: 4, E: 5, A: 1, S: 1 }), D, {});
  assert.equal(b.ranking[0].id, 'E');
  assert.equal(b.ranking[1].id, 'C');
  assert.equal(b.archetypeKey, 'CE');
  assert.equal(b.archetype.name, '推进者');
});

test('10 种组合 + 均衡型都有文案', () => {
  const keys = ['OC', 'OE', 'OA', 'OS', 'CE', 'CA', 'CS', 'EA', 'ES', 'AS', 'EQUAL'];
  keys.forEach((k) => {
    assert.ok(D.archetypes[k], k + ' 缺少文案');
    assert.ok(D.archetypes[k].name && D.archetypes[k].blurb && D.archetypes[k].risk, k + ' 文案不完整');
  });
});

test('分档边界', () => {
  assert.equal(E.bandOf(0), '很低');
  assert.equal(E.bandOf(19), '很低');
  assert.equal(E.bandOf(20), '偏低');
  assert.equal(E.bandOf(40), '中等');
  assert.equal(E.bandOf(59), '中等');
  assert.equal(E.bandOf(60), '偏高');
  assert.equal(E.bandOf(79), '偏高');
  assert.equal(E.bandOf(80), '很高');
  assert.equal(E.bandOf(100), '很高');
});

test('未答完：complete=false，不给类型', () => {
  const a = fill(4);
  a[0] = null;
  a[7] = null;
  const r = E.score(a, D, {});
  assert.equal(r.complete, false);
  assert.equal(r.unanswered.length, 2);
  assert.equal(r.archetypeKey, null);
  assert.equal(r.answeredCount, 38);
});

test('作答质量：用时与平均秒数', () => {
  const r = E.score(fill(4), D, { durationMs: 40 * 15000 });
  assert.equal(Math.round(r.quality.avgSec), 15);
  const fast = E.score(fill(4), D, { durationMs: 40 * 1000 });
  assert.ok(fast.quality.flags.some((f) => f.code === 'fast'));
});

test('每条轴的四个面向分数一定参与平均', () => {
  const r = E.score(byAxisBase({ O: 5, C: 3, E: 1, A: 3, S: 3 }), D, {});
  const O = r.axes.find((a) => a.id === 'O');
  const avg = Math.round(O.facets.reduce((s, f) => s + f.score, 0) / 4);
  assert.equal(O.score, avg);
  O.facets.forEach((f) => assert.ok(f.score >= 0 && f.score <= 100));
});
