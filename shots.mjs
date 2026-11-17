// Capture 4 real screenshots of game/index.html via CDP — no npm deps.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = '/root/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const URL_GAME = 'http://127.0.0.1:8123/index.html?shots=1';
const OUT = '/root/games/last-dawn/screenshots';
const PORT = 9333;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--no-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', '--enable-webgl',
  '--ignore-gpu-blocklist', '--enable-features=Vulkan',
  '--hide-scrollbars', '--window-size=1280,760',
  '--user-data-dir=/tmp/shots-profile', 'about:blank',
], { stdio: 'ignore' });

const j = async (p) => (await fetch(`http://127.0.0.1:${PORT}${p}`)).json();

let target = null;
for (let i = 0; i < 40; i++) {
  try {
    const list = await j('/json/list');
    target = list.find((t) => t.type === 'page');
    if (target) break;
  } catch {}
  await sleep(250);
}
if (!target) { proc.kill(); throw new Error('chrome did not start'); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, x) => { ws.onopen = r; ws.onerror = x; });

let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
const send = (method, params = {}) => new Promise((res) => {
  const n = ++id;
  pending.set(n, res);
  ws.send(JSON.stringify({ id: n, method, params }));
});

const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  return r.result?.result?.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1280, height: 760, deviceScaleFactor: 1, mobile: false,
});

await send('Page.navigate', { url: URL_GAME });
await sleep(4500);

// Wait for the game script to be ready
for (let i = 0; i < 30; i++) {
  const ok = await evaluate('typeof THREE !== "undefined" && typeof state !== "undefined"');
  if (ok) break;
  await sleep(300);
}

const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const b = Buffer.from(r.result.data, 'base64');
  writeFileSync(`${OUT}/${name}`, b);
  console.log('wrote', name, b.length, 'bytes');
};

// 1 — title screen (cover)
await evaluate('state="title"; ovEl.innerHTML=`<div class="card"><h1>Last Dawn</h1><p class="sub">Hold the Kingdom</p><p class="hint">Survive 8 nights. Gather, craft, build, defend.</p><button data-a="go">Begin</button></div>`');
await sleep(900);
await shot('1-title.png');

// 2 — day 1 gathering (sheet closed, world in view)
await evaluate(`
  state='play';
  ovEl.innerHTML='';
  S.wood=14; S.stone=9; S.plank=6; S.iron=3; S.food=5;
  S.day=1; S.dusk=0; S.tt=42;
  S.sw=1; S.ar=1;
  P.m.position.set(9,0,4);
  tab=0; lastPanel='';
  sideEl.classList.remove('up');
  sideEl.style.transform='translateY(100%)';
  fr=0;
  'ok'
`);
await sleep(1800);
await shot('2-gathering.png');

// 3 — crafting sheet open, Gear tab showing tiers + durability
await evaluate(`
  tab=1; lastPanel='';
  sideEl.style.transform='translateY(0)';
  sideEl.classList.add('up');
  say('Pickaxe ready — mine ore for Iron');
  'ok'
`);
await sleep(1500);
await shot('3-crafting.png');

// 4 — night assault: spawn real enemies and let them close in
await evaluate(`
  sideEl.classList.remove('up');
  sideEl.style.transform='translateY(100%)';
  S.day=3; S.dusk=1; S.tt=0; S.night=1;
  S.plank=20; S.stone=20; S.iron=10; S.sw=2; S.ar=1;
  lastPanel='';
  'ok'
`);
await sleep(900);
// force enemy spawn through the game's own spawner, then advance the sim
await evaluate(`
  en.length=0;
  spawn();
  // pull them toward the castle so they are on camera, not at the 72u horizon
  en.forEach((u,i)=>{const a=(i/en.length)*6.283;u.m.position.set(Math.cos(a)*13,0,Math.sin(a)*13+13);});
  say('NIGHT 3: defend the castle! Assault from the '+S.dir);
  'enemies=' + en.length
`);
await sleep(3500);
await shot('4-night.png');

ws.close();
proc.kill();
console.log('done');
