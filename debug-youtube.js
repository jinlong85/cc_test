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

  // Find a page target that we can use
  let targetId = pageTargets.find(t => t.url !== 'about:blank')?.targetId || pageTargets[0].targetId;
  console.log('Attaching to target:', targetId);

  const attachResult = await send('Target.attachToTarget', { targetId, flatten: true });
  const sessionId = attachResult.result.sessionId;
  console.log('Session ID:', sessionId);

  // Navigate to YouTube
  console.log('Navigating to YouTube...');
  const navResult = await send('Page.navigate', { url: 'https://www.youtube.com/@%E6%96%B0%E5%AE%87%E5%9C%BA/videos' }, sessionId);
  console.log('Navigation result:', navResult.result);

  // Wait longer for page to load
  console.log('Waiting for page to load (15 seconds)...');
  await new Promise(r => setTimeout(r, 15000));

  // First, let's see what elements are on the page
  console.log('Checking page content...');
  const docResult = await send('Runtime.evaluate', {
    expression: `document.title + ' | Body children: ' + document.body.children.length`
  }, sessionId);

  console.log('Page title:', docResult.result.result.value);

  // Get video list with more generic selectors
  const evalResult = await send('Runtime.evaluate', {
    expression: `
      (() => {
        // Try multiple selectors
        const selectors = [
          'ytd-rich-item-renderer',
          'ytd-grid-video-renderer',
          'ytd-video-renderer',
          'ytd-shelf-renderer',
          '#contents > ytd-rich-grid-renderer',
          '#contents > ytd-grid-renderer',
          '#items'
        ];

        let items = [];
        for (const sel of selectors) {
          items = document.querySelectorAll(sel);
          console.log('Selector: ' + sel + ' found ' + items.length);
          if (items.length > 0) break;
        }

        // Try to find video items
        const allItems = document.querySelectorAll('*');
        let videoItems = [];
        allItems.forEach(el => {
          if (el.tagName && el.tagName.includes('VIDEO')) {
            videoItems.push(el.parentElement);
          }
        });

        return {
          bodyChildren: document.body.children.length,
          selectorResults: selectors.map(s => ({ selector: s, count: document.querySelectorAll(s).length })),
          videoItemCount: videoItems.length
        };
      })()
    `
  }, sessionId);

  console.log('Page analysis:', evalResult.result.result.value);

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
