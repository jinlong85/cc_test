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

  // Find existing page or create new
  let targetId = pageTargets.find(t => t.url !== 'about:blank')?.targetId;

  if (!targetId) {
    const newTarget = await send('Target.createTarget', { url: 'about:blank' });
    targetId = newTarget.result.targetId;
  }

  console.log('Using target:', targetId);

  // Attach to target
  const attachResult = await send('Target.attachToTarget', { targetId, flatten: true });
  const sessionId = attachResult.result.sessionId;
  console.log('Session ID:', sessionId);

  // Navigate to YouTube
  console.log('Navigating to YouTube @新官场...');
  await send('Page.navigate', { url: 'https://www.youtube.com/@新官场/videos' }, sessionId);

  // Wait for page to load
  console.log('Waiting for page to load...');
  await new Promise(r => setTimeout(r, 10000));

  // Take screenshot
  console.log('Taking screenshot...');
  const screenshotResult = await send('Page.captureScreenshot', { format: 'png' }, sessionId);

  if (screenshotResult.result && screenshotResult.result.data) {
    const fs = require('fs');
    const buffer = Buffer.from(screenshotResult.result.data, 'base64');
    fs.writeFileSync('screenshot.png', buffer);
    console.log('Screenshot saved to screenshot.png');
  } else {
    console.log('Failed to take screenshot:', screenshotResult);
  }

  // Get page title
  const titleResult = await send('Runtime.evaluate', { expression: 'document.title' }, sessionId);
  console.log('Page title:', titleResult.result.result.value);

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
