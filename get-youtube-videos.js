const WebSocket = require('ws');

const WS_ENDPOINT = 'ws://127.0.0.1:9222/devtools/browser/69602e4c-83b9-4fa9-a2eb-c45b01b464da';

const ws = new WebSocket(WS_ENDPOINT);
let id = 1;
const pending = new Map();

function send(method, params = {}, sessionId = null) {
  return new Promise((resolve, reject) => {
    const msgId = id++;
    const msg = { id: msgId, method, params };
    if (sessionId) {
      msg.sessionId = sessionId;
    }
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify(msg));
  });
}

ws.on('open', async () => {
  console.log('Connected to Chrome DevTools');

  // Get all targets
  const targets = await send('Target.getTargets');
  const pageTargets = targets.result.targetInfos.filter(t => t.type === 'page');

  console.log('Found', pageTargets.length, 'page targets');

  // Attach to a page target (prefer a real page over about:blank)
  let targetId = pageTargets.find(t => t.url !== 'about:blank')?.targetId || pageTargets[0].targetId;
  console.log('Attaching to target:', targetId);

  const attachResult = await send('Target.attachToTarget', { targetId, flatten: true });
  const sessionId = attachResult.result.sessionId;
  console.log('Session ID:', sessionId);

  // Navigate to YouTube
  console.log('Navigating to YouTube...');
  const navResult = await send('Page.navigate', { url: 'https://www.youtube.com/@%E6%96%B0%E5%AE%87%E5%9C%BA/videos' }, sessionId);
  console.log('Navigation result:', JSON.stringify(navResult, null, 2));

  // Wait for page to load
  console.log('Waiting for page to load...');
  await new Promise(r => setTimeout(r, 10000));

  // Get video list
  console.log('Extracting video list...');
  const evalResult = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const videos = [];
        const items = document.querySelectorAll('ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer');
        for (let i = 0; i < Math.min(10, items.length); i++) {
          const item = items[i];
          const titleEl = item.querySelector('#video-title, #title, h3.title, a#video-title');
          const title = titleEl ? titleEl.textContent.trim() : 'N/A';
          const metaLine = item.querySelector('#metadata-line, .metadata-wrapper');
          const spans = metaLine ? metaLine.querySelectorAll('span') : [];
          const views = spans[0] ? spans[0].textContent : 'N/A';
          const date = spans[1] ? spans[1].textContent : 'N/A';
          const linkEl = item.querySelector('a#video-title, a#thumbnail, a');
          const link = linkEl ? linkEl.href : 'N/A';
          const thumb = item.querySelector('img') ? item.querySelector('img').src : 'N/A';
          videos.push({ index: i + 1, title: title.substring(0, 100), views, date, link, thumbnail: thumb });
        }
        return videos;
      })()
    `
  }, sessionId);

  console.log('\n=== YouTube 新办公室 频道视频列表 (前10个) ===\n');

  if (evalResult.result && evalResult.result.result && evalResult.result.result.value) {
    const videos = JSON.parse(evalResult.result.result.value);
    videos.forEach(v => {
      console.log(v.index + '. ' + v.title);
      console.log('   观看: ' + v.views + ' | 日期: ' + v.date);
      console.log('   链接: ' + v.link);
      console.log('');
    });
  } else {
    console.log('未能获取视频列表');
    console.log('Result:', JSON.stringify(evalResult, null, 2));
  }

  ws.close();
  process.exit(0);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.id && pending.has(msg.id)) {
    const handler = pending.get(msg.id);
    handler.resolve(msg);
    pending.delete(msg.id);
  }
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err.message);
  process.exit(1);
});
