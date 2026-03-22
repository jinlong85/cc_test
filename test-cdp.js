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

  // Get targets
  const targets = await send('Target.getTargets');
  console.log('Targets response:', JSON.stringify(targets, null, 2));

  ws.close();
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
});
