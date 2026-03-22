const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const CONFIG = {
  downloadPath: path.join(__dirname, 'weibo_photos'),
  waitSeconds: 35
};

if (!fs.existsSync(CONFIG.downloadPath)) {
  fs.mkdirSync(CONFIG.downloadPath, { recursive: true });
}

function saveCookies(cookies, filePath) {
  fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2));
}

function loadCookies(filePath) {
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return null;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadImage(response.headers.location, filePath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`状态码: ${response.statusCode}`));
        return;
      }
      const fileStream = fs.createWriteStream(filePath);
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    });
    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('下载超时'));
    });
  });
}

function getOriginalUrl(thumbUrl) {
  let originalUrl = thumbUrl;
  if (thumbUrl.includes('sinaimg.cn') || thumbUrl.includes('weibo.com')) {
    if (thumbUrl.includes('/large/')) return thumbUrl;
    originalUrl = thumbUrl.replace(/\/thumb\d+\//, '/large/');
    originalUrl = originalUrl.replace(/\/orj\d+\//, '/large/');
    originalUrl = originalUrl.replace(/\/\d+\//, '/large/');
  }
  return originalUrl;
}

async function main() {
  console.log('===========================================');
  console.log('       微博图片下载器 - 稳定版');
  console.log('===========================================');
  console.log('');

  let browser;
  try {
    console.log('连接 Chrome...');
    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null,
      timeout: 15000
    });
    console.log('连接成功');
  } catch (e) {
    console.log('连接失败:', e.message);
    return;
  }

  // 等待浏览器稳定
  await wait(2000);

  let page;
  try {
    // 获取第一个页面
    const pages = await browser.pages();
    page = pages[0];
    if (!page) {
      page = await browser.newPage();
    }
  } catch (e) {
    console.log('获取页面失败');
    await browser.disconnect();
    return;
  }

  // 加载cookies
  const cookiesPath = path.join(__dirname, 'weibo_cookies.json');
  const savedCookies = loadCookies(cookiesPath);
  if (savedCookies) {
    try {
      await page.setCookie(...savedCookies);
    } catch (e) {}
  }

  console.log('');
  console.log('【步骤1】请在浏览器中操作');
  console.log('-------------------------------------------');
  console.log('1. 进入微博博主的主页或相册');
  console.log('2. 滚动加载更多内容');
  console.log('');
  console.log(`脚本将在 ${CONFIG.waitSeconds} 秒后自动扫描...`);
  console.log('===========================================');

  await wait(CONFIG.waitSeconds * 1000);

  // 获取当前页面URL
  let currentUrl = '';
  try {
    currentUrl = await page.url();
  } catch (e) {
    console.log('获取页面URL失败');
    await browser.disconnect();
    return;
  }

  console.log(`\n当前页面: ${currentUrl}`);

  if (!currentUrl.includes('weibo.com')) {
    console.log('请在浏览器中打开微博页面后重新运行脚本');
    await browser.disconnect();
    return;
  }

  // 扫描图片
  console.log('\n【步骤2】扫描图片');
  console.log('-------------------------------------------');

  let photos = [];
  try {
    photos = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const imgs = document.querySelectorAll('img');

      for (const img of imgs) {
        let src = img.src || img.dataset.src;
        if (!src) continue;
        if (!src.includes('weibo') && !src.includes('sinaimg.cn')) continue;
        if (src.includes('avatar') || src.includes('default') || src.includes('icon')) continue;
        if (src.includes('/30/') || src.includes('/20/') || src.includes('/50/')) continue;
        if (seen.has(src)) continue;

        seen.add(src);
        results.push({
          thumbUrl: src,
          width: img.naturalWidth || img.width || 0,
          height: img.naturalHeight || img.height || 0
        });
      }
      return results;
    });
  } catch (e) {
    console.log('扫描图片失败:', e.message);
    await browser.disconnect();
    return;
  }

  if (photos.length === 0) {
    console.log('未找到图片');
    await browser.disconnect();
    return;
  }

  console.log(`找到 ${photos.length} 张图片`);

  // 解析原图
  const photoList = photos.map(p => ({
    thumbUrl: p.thumbUrl,
    originalUrl: getOriginalUrl(p.thumbUrl),
    width: p.width,
    height: p.height,
    pixels: p.width * p.height
  })).sort((a, b) => b.pixels - a.pixels);

  console.log('');
  console.log('【步骤3】原图下载地址清单');
  console.log('===========================================');

  const displayCount = Math.min(25, photoList.length);
  for (let i = 0; i < displayCount; i++) {
    const p = photoList[i];
    const label = p.width > 2000 ? '[4K]' : p.width > 1000 ? '[高清]' : '[普通]';
    console.log(`${i + 1}. ${label} ${p.width}x${p.height}`);
  }

  console.log('');
  console.log('===========================================');

  const downloadCount = Math.min(20, photoList.length);
  console.log(`\n【步骤4】下载前 ${downloadCount} 张`);
  console.log('-------------------------------------------');

  let downloaded = 0;
  for (let i = 0; i < downloadCount; i++) {
    const p = photoList[i];
    const ext = p.originalUrl.includes('.png') ? 'png' : 'jpg';
    const fileName = `weibo_${Date.now()}_${i + 1}.${ext}`;
    const filePath = path.join(CONFIG.downloadPath, fileName);

    console.log(`下载 ${i + 1}/${downloadCount} (${p.width}x${p.height})...`);

    try {
      await downloadImage(p.originalUrl, filePath);
      downloaded++;
    } catch (e) {
      try {
        await downloadImage(p.thumbUrl, filePath);
        downloaded++;
      } catch (e2) {
        console.error(`  失败`);
      }
    }
  }

  console.log('');
  console.log('===========================================');
  console.log(`完成！成功: ${downloaded}/${downloadCount}`);
  console.log(`保存位置: ${CONFIG.downloadPath}`);
  console.log('===========================================');

  try {
    const { exec } = require('child_process');
    if (process.platform === 'win32') {
      exec(`start "" "${CONFIG.downloadPath}"`);
    }
  } catch (e) {}

  try {
    await browser.disconnect();
  } catch (e) {}
}

main().catch(e => {
  console.log('错误:', e.message);
});
