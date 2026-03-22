const WebSocket = require('ws');

const WS_ENDPOINT = 'ws://127.0.0.1:9222/devtools/browser/69602e4c-83b9-4fa9-a2eb-c45b01b464da';

const ws = new WebSocket(WS_ENDPOINT);
let id = 1;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const msgId = id++;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

ws.on('open', async () => {
  console.log('Connected to Chrome DevTools');

  // Create a new page target
  console.log('Creating new page target...');
  const newTarget = await send('Target.createTarget', { url: 'about:blank' });
  const sessionId = newTarget.result.targetId;
  console.log('Created new target:', sessionId);

  // Attach to the new target using Target.attachToTarget
  console.log('Attaching to target...');
  const attachResult = await send('Target.attachToTarget', { targetId: sessionId, flatten: true });
  console.log('Attach result:', JSON.stringify(attachResult, null, 2));

  const sessionId2 = attachResult.result.sessionId;
  console.log('Session ID:', sessionId2);

  // Send commands to the attached session
  // Use the same WebSocket but with sessionId parameter or different format

  // Try using HTTP to send commands
  // Actually, let's try a different approach - use the browser's existing page if any

  // First, let's check existing pages
  const targets = await send('Target.getTargets');
  console.log('Target infos:', JSON.stringify(targets.result.targetInfos, null, 2));

  // Find existing page targets
  const pageTargets = targets.result.targetInfos.filter(t => t.type === 'page');
  console.log('Page targets:', pageTargets.length);

  if (pageTargets.length > 0) {
    // Try to attach to the first page target
    const pageTarget = pageTargets[0];
    console.log('Attaching to page target:', pageTarget.targetId);

    const attachPageResult = await send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
    console.log('Attach page result:', JSON.stringify(attachPageResult, null, 2));
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
