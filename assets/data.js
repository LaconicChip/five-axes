/* FIVE AXES — 题库与文案
 * 5 条轴 × 4 个面向 × 2 题 = 40 题，其中 4 题反向计分（reverse: true）
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FIVE_DATA = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCALE = [
    { value: 1, label: '非常不同意' },
    { value: 2, label: '比较不同意' },
    { value: 3, label: '说不清' },
    { value: 4, label: '比较同意' },
    { value: 5, label: '非常同意' }
  ];

  var axes = [
    {
      id: 'O',
      zh: '开放性',
      en: 'OPENNESS',
      line: '你如何对待陌生、复杂与未定之事',
      high: '你对新信息、新形式、新立场有天然胃口，愿意为了「看看会怎样」而偏离既定路线。',
      low: '你偏好已被验证的做法，对花哨的新东西保持审慎——这让你少踩坑，也少惊喜。',
      cost: '开放性高的人容易把「开始」当成「完成」：想法太多时，没有一个被做到能被检验。',
      work: '开放性高适合不断定义问题的位置；偏低更适合在既定框架里把一件事做深。',
      rel: '高的人需要能聊「没用的事」的同伴；低的人更想要可预期、说到做到的相处。',
      stress: '压力下，高者退回想法里用「再想想」延迟行动；低者退回熟悉的流程里求稳。',
      facets: [
        { id: 'O1', name: '想象力', h: '你在脑内先跑一遍世界，再决定要不要动真格。', l: '你更愿意对着眼前具体的东西做，而不是在脑子里搭空场景。' },
        { id: 'O2', name: '审美敏感', h: '形式本身能打动你：颜色、节奏、一个句子的断点。', l: '你更在意内容管不管用，形式好坏对你影响有限。' },
        { id: 'O3', name: '求知欲', h: '不确定对你是钩子，不是威胁——你会为了弄懂而多花时间。', l: '你按需取用信息，不为「知道」本身花时间。' },
        { id: 'O4', name: '求变', h: '重复消耗你，你愿意为变化承担一点风险。', l: '稳定给你安全感，你能在固定流程里做得很好。' }
      ]
    },
    {
      id: 'C',
      zh: '尽责性',
      en: 'CONSCIENTIOUSNESS',
      line: '你如何对待承诺、秩序与长线目标',
      high: '你靠结构推进事情：先拆解、再排序、按点交付。别人把事交给你时，通常不需要再追。',
      low: '你更依赖临场状态而非流程，边界常常在最后一刻才收紧。',
      cost: '尽责性高到某个点会变成控制：标准越抬越高，收尾越来越难，或者不肯把半成品交出去。',
      work: '尽责性高适合有明确交付物和长线目标的位置；偏低的人在松散组织里容易耗在补漏上。',
      rel: '高的人用「我帮你办好了」表达在意；低的人更愿意用当下的陪伴表达。',
      stress: '压力下，高者收紧控制：检查更多、放手更少；低者容易先停摆，再靠冲刺补回来。',
      facets: [
        { id: 'C1', name: '条理性', h: '物品、文件、日程彼此有位置，找东西不消耗你。', l: '秩序不是必需品，你能在混乱里找到自己的路径。' },
        { id: 'C2', name: '自律', h: '没人看着的时候，你仍然按自己的标准做事。', l: '你更需要外部节奏——截止日、同伴、公开承诺。' },
        { id: 'C3', name: '成就追求', h: '你用「做到什么程度」给一天打分。', l: '你不太用成果给自己打分，更在意过程舒不舒服。' },
        { id: 'C4', name: '审慎', h: '按下发送键之前，你会先想一遍后果。', l: '你先做再想，靠反馈校正——快，但偶尔要付返工成本。' }
      ]
    },
    {
      id: 'E',
      zh: '外向性',
      en: 'EXTRAVERSION',
      line: '你的能量从哪来，又如何向外投放',
      high: '人、声音、现场会给你充电；你倾向于先说出来，再想清楚。',
      low: '独处恢复能量，你先想清楚再开口。这不等于害羞，只是耗电方式不同。',
      cost: '外向性高的人容易在「热闹」里错过只有安静才给出的判断，也容易答应太多事。',
      work: '外向性高在对话、推动、现场反应里最好；偏低的人在需要长时间独处深钻的位置上更稳。',
      rel: '高的人先说出口，也期待回应；低的人的沉默容易被误读为疏远。',
      stress: '压力下，高者更想找人；低者更想关掉所有窗口。',
      facets: [
        { id: 'E1', name: '热情', h: '情绪写在脸上，别人不用猜你在想什么。', l: '情绪收在里面，亲近的人也需要时间才读得懂。' },
        { id: 'E2', name: '社交主动', h: '你天然会发起：开场、约人、把冷场接住。', l: '你不主动发起，但被邀请时能很好地参与。' },
        { id: 'E3', name: '果断', h: '信息不全你也敢拍板，并承担拍错的后果。', l: '你更愿意等条件成熟，也不愿替所有人做决定。' },
        { id: 'E4', name: '活力', h: '语速、动作、节奏偏快，日程越满越兴奋。', l: '你以较慢但稳定的节奏运转，连续高强度会明显掉电。' }
      ]
    },
    {
      id: 'A',
      zh: '宜人性',
      en: 'AGREEABLENESS',
      line: '你把别人放在什么位置',
      high: '你默认合作而非对抗，也能感受到别人没说出口的那部分。',
      low: '你更看重事情本身的正确，不怕让人不舒服——这既是锋利，也是成本。',
      cost: '宜人性高的人容易把「不拒绝」当成「善良」：边界一点点让出去，最后用疲惫买单。',
      work: '宜人性高适合协作与客户界面；偏低的人在需要强硬谈判、砍需求时有优势。',
      rel: '高的人容易先照顾对方情绪；低的人更早说出自己的边界。',
      stress: '压力下，高者答应更多，用「帮别人」回避自己的事；低者先把人推开。',
      facets: [
        { id: 'A1', name: '信任', h: '你先给出善意，等对方证明不值得再收回。', l: '你先保留判断，等对方证明值得再给出。' },
        { id: 'A2', name: '利他', h: '帮到人本身就让你愉快，不需要兑换成回报。', l: '你更愿意把力气花在自己的事上。' },
        { id: 'A3', name: '合作', h: '争执时你优先保住关系与结果，而不是赢。', l: '你愿意为一个正确的主张把冲突摆上桌面。' },
        { id: 'A4', name: '体谅', h: '你能读出语气、停顿和表情里的信息。', l: '你按字面理解别人，不擅长也不喜欢猜。' }
      ]
    },
    {
      id: 'S',
      zh: '情绪稳定性',
      en: 'STABILITY',
      line: '波动来时，你还剩多少操作空间',
      high: '情绪波动幅度小，恢复快；压力之下，你的判断不容易被劫持。',
      low: '你对威胁信号更敏感，情绪起伏大。这让你更早嗅到风险，但内耗也更多。',
      cost: '稳定到某个点会变成麻木：该紧张的时候不紧张，容易错过真正的警报。',
      work: '稳定性高在高压、突发事件多的环境里相对不吃亏；偏低的人对风险更早察觉，但更耗电。',
      rel: '高的人不外露波动，对方可能低估你的在意；低的人的波动本身就是信号。',
      stress: '压力下，高者看起来没事，代价是身体替他记账；低者需要更早地停下来。',
      facets: [
        { id: 'S1', name: '镇定', h: '突发状况下，你的语速会变慢，而不是变快。', l: '意外发生时你先紧张，需要几秒才回到理性。' },
        { id: 'S2', name: '平稳', h: '心情不随单件事大幅翻转。', l: '一件小事能改变你一整天的底色。' },
        { id: 'S3', name: '抗压', h: '压力上升时，效率跟着上升。', l: '压力上升时，效率先下降，得先处理情绪。' },
        { id: 'S4', name: '乐观', h: '未定之事，你默认它有好结果。', l: '未定之事，你先看到风险，先做准备。' }
      ]
    }
  ];

  var items = [
    { axis: 'O', facet: 'O1', text: '我常在脑子里预演还没发生的事。', reverse: false },
    { axis: 'O', facet: 'O2', text: '我会因为一句话的节奏好听而记住它。', reverse: false },
    { axis: 'O', facet: 'O1', text: '开会走神时，我多半在想一个跟议题无关的点子。', reverse: false },
    { axis: 'O', facet: 'O2', text: '走过一面墙，我会注意到它的配色。', reverse: false },
    { axis: 'O', facet: 'O3', text: '遇到不懂的词，我会立刻去查，哪怕它出现在闲聊里。', reverse: false },
    { axis: 'O', facet: 'O3', text: '我愿意听立场相反的人把话讲完。', reverse: false },
    { axis: 'O', facet: 'O4', text: '同一家店去过三次以上，我就想换一家。', reverse: false },
    { axis: 'O', facet: 'O4', text: '计划被临时改掉时，我的第一反应是好奇。', reverse: false },

    { axis: 'C', facet: 'C1', text: '我的桌面有明确的位置规则。', reverse: false },
    { axis: 'C', facet: 'C1', text: '我常把东西随手一放，用到时再找。', reverse: true },
    { axis: 'C', facet: 'C2', text: '说好今天做完的事，我很少拖到明天。', reverse: false },
    { axis: 'C', facet: 'C2', text: '我常常到截止日期前才开始真正动手。', reverse: true },
    { axis: 'C', facet: 'C3', text: '完成一件事后，我更快想到的是哪里还能更好。', reverse: false },
    { axis: 'C', facet: 'C3', text: '我更愿意接有明确标准、能被评价的任务。', reverse: false },
    { axis: 'C', facet: 'C4', text: '做决定前，我会先把最坏的结果想清楚。', reverse: false },
    { axis: 'C', facet: 'C4', text: '我很少在情绪上来的时候发消息。', reverse: false },

    { axis: 'E', facet: 'E1', text: '和陌生人待在一个房间里，我会先开口。', reverse: false },
    { axis: 'E', facet: 'E1', text: '我的情绪很容易被别人看见。', reverse: false },
    { axis: 'E', facet: 'E2', text: '周末我更愿意出门见人，而不是一个人待着。', reverse: false },
    { axis: 'E', facet: 'E2', text: '在人多的场合，我通常待得越久越有精神。', reverse: false },
    { axis: 'E', facet: 'E3', text: '讨论卡住时，我会直接说「就这么定」。', reverse: false },
    { axis: 'E', facet: 'E3', text: '我不介意在会议上成为被注视的那个人。', reverse: false },
    { axis: 'E', facet: 'E4', text: '我说话的速度比身边的人快。', reverse: false },
    { axis: 'E', facet: 'E4', text: '一天排满事，我反而更来劲。', reverse: false },

    { axis: 'A', facet: 'A1', text: '在没被证明之前，我默认别人说的是真的。', reverse: false },
    { axis: 'A', facet: 'A1', text: '我很少去猜别人话里的第二层意思。', reverse: false },
    { axis: 'A', facet: 'A2', text: '帮别人解决问题本身就让我愉快，不需要回报。', reverse: false },
    { axis: 'A', facet: 'A2', text: '别人开口求助时，我很难说「我现在没空」。', reverse: false },
    { axis: 'A', facet: 'A3', text: '争执时，我更在意把事办成，而不是谁对。', reverse: false },
    { axis: 'A', facet: 'A3', text: '我能接受一个不完美但大家都同意的方案。', reverse: false },
    { axis: 'A', facet: 'A4', text: '我能从别人的表情里读出他没说出口的话。', reverse: false },
    { axis: 'A', facet: 'A4', text: '听人讲烦心事，我先想他的感受，再想解决办法。', reverse: false },

    { axis: 'S', facet: 'S1', text: '突发状况下，我说话反而会更慢。', reverse: false },
    { axis: 'S', facet: 'S1', text: '被人当众质疑时，我能很快恢复原来的语气。', reverse: false },
    { axis: 'S', facet: 'S2', text: '我的心情不太会因为一件小事就翻转。', reverse: false },
    { axis: 'S', facet: 'S2', text: '我的情绪起伏比身边的人大。', reverse: true },
    { axis: 'S', facet: 'S3', text: '截止日期越近，我越能进入状态。', reverse: false },
    { axis: 'S', facet: 'S3', text: '压力大的时候，我睡得着。', reverse: false },
    { axis: 'S', facet: 'S4', text: '我倾向于相信事情最后会好起来。', reverse: false },
    { axis: 'S', facet: 'S4', text: '事情没定下来之前，我更多想的是会出岔子。', reverse: true }
  ];

  /* 类型：按轴分从高到低取前两轴，组合键始终按 O C E A S 的顺序书写 */
  var archetypes = {
    OC: { name: '建构者', blurb: '先想清楚，再把它做成能运行的东西。你不太相信「先干起来再说」。', risk: '标准抬得太高，开工和收尾都会变慢。' },
    OE: { name: '点火者', blurb: '把气氛和可能性同时点着，别人要跟着你才敢动。', risk: '开头太多，收尾太少，旧项目在硬盘里排队。' },
    OA: { name: '译者', blurb: '把抽象的东西讲成人话，也愿意为别人的感受调整表达。', risk: '把「理解别人」当成义务，最后没人替你说话。' },
    OS: { name: '勘探者', blurb: '独自往深处走，越不确定越清醒。', risk: '很少让人进来，也很少求助。' },
    CE: { name: '推进者', blurb: '把目标拆成日程，把人推着往前走，而且真的会到。', risk: '把节奏当成唯一正确答案，慢的人会被你判为不合格。' },
    CA: { name: '守护者', blurb: '可靠、体贴、说到做到，是团体里那个「不用担心」的人。', risk: '永远把自己排在最后。' },
    CS: { name: '工程师', blurb: '冷静、精确、耐受长周期，能把复杂系统维持在可用状态。', risk: '沉默地扛，直到某一刻突然断。' },
    EA: { name: '黏合剂', blurb: '让一群人生出「我们」的感觉，冲突在你手里会变软。', risk: '为了和气，把真问题留到最后。' },
    ES: { name: '前锋', blurb: '敢在人前承担，也能在压力下不掉线。', risk: '把「扛得住」当成不需要休息。' },
    AS: { name: '锚', blurb: '你不抢话，但你一开口，屋子会安静下来。', risk: '太能忍，被当成没有意见。' },
    EQUAL: { name: '均衡型', blurb: '五条轴都落在中线附近：你更像水，按场合变形，而不是靠一种固定姿态取胜。', risk: '很难被一句话概括，也容易在需要表态时模糊。' }
  };

  /* 呈现顺序：五轴轮流抽题，避免连续同维度造成的作答惯性。索引指向 items */
  var order = [];
  var byAxis = {};
  items.forEach(function (it, i) {
    (byAxis[it.axis] = byAxis[it.axis] || []).push(i);
  });
  var ids = ['O', 'C', 'E', 'A', 'S'];
  var maxLen = Math.max.apply(null, ids.map(function (id) { return byAxis[id].length; }));
  for (var r = 0; r < maxLen; r++) {
    for (var k = 0; k < ids.length; k++) {
      var list = byAxis[ids[(r + k) % ids.length]];
      if (list && list[r] !== undefined) order.push(list[r]);
    }
  }

  return {
    meta: {
      title: 'FIVE AXES',
      subtitle: '大五人格 · 深度档案',
      total: items.length,
      minutes: 8,
      version: '1.0'
    },
    scale: SCALE,
    axes: axes,
    items: items,
    order: order,
    archetypes: archetypes
  };
});
