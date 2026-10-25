// 批量截图：node tests/shoot.mjs shots/jobs.json
// jobs.json 里每一项：{ url, out, w, h, mobile, full, eval(文件路径或空), dark }
import fs from 'node:fs';

const specPath = process.argv[2];
if (!specPath) { console.error('用法: node tests/shoot.mjs <jobs.json>'); process.exit(1); }
const jobs = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page;
    } catch (e) { /* 等浏览器 */ }
    await sleep(250);
  }
  throw new Error('找不到可用的调试目标');
}

const page = await target();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const mid = ++id;
  pending.set(mid, { resolve, reject });
  ws.send(JSON.stringify({ id: mid, method, params }));
});

await send('Page.enable');
await send('Runtime.enable');

for (const job of jobs) {
  const { url, out, w = 1440, h = 1000, mobile = false, full = false, eval: evalFile = '', dark = false } = job;

  await send('Emulation.setDeviceMetricsOverride', {
    width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile
  });
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }]
  });

  await send('Page.navigate', { url });
  await sleep(1200);

  if (evalFile) {
    const code = fs.readFileSync(evalFile, 'utf8');
    const r = await send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('页面脚本报错: ' + JSON.stringify(r.exceptionDetails.exception));
    await sleep(700);
  }

  const m = await send('Runtime.evaluate', {
    expression: 'JSON.stringify({w:innerWidth,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,t:document.title})',
    returnByValue: true
  });
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full });
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log(out, m.result.value);
}

ws.close();
process.exit(0);
