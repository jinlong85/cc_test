const puppeteer = require('puppeteer-core');
const fs = require('fs');

// 尝试多个可能的 Chrome 路径
const possiblePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
  '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe'
];

async function testChrome() {
  console.log('测试 Chrome 连接...\n');

  let chromePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      chromePath = p;
      console.log('找到 Chrome:', p);
      break;
    }
  }

  if (!chromePath) {
    console.error('未找到 Chrome');
    process.exit(1);
  }

  // 尝试连接已运行的 Chrome
  try {
    console.log('尝试连接到 localhost:9222...');
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });
    console.log('连接成功！');
    const pages = await browser.pages();
    console.log('打开的页面数:', pages.length);
    await browser.disconnect();
    console.log('\nChrome 测试通过！可以使用完整脚本。');
  } catch (e) {
    console.log('无法连接到已运行的 Chrome');
    console.log('将尝试启动新实例...');

    try {
      const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: false,
        args: ['--start-maximized', '--no-sandbox'],
        defaultViewport: null,
        userDataDir: null
      });
      console.log('新 Chrome 启动成功！');
      await browser.close();
      console.log('\nChrome 测试通过！');
    } catch (e2) {
      console.error('启动失败:', e2.message);
    }
  }
}

testChrome().catch(console.error);
