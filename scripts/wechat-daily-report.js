/**
 * 微信日报监控与推送脚本
 * 功能：扫描微信下载目录，读取Word日报，生成报告发送到邮箱
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const mammoth = require('mammoth');
const nodeCron = require('node-cron');
const XLSX = require('xlsx');

// ============== 配置区域 ==============
const CONFIG = {
  // 微信文件下载目录
  watchDir: '/mnt/d/Users/JINLONG/Documents/xwechat_files/jinlong85_e550/msg/file',

  // 邮件配置
  email: {
    to: 'jinlong85@qq.com',
    from: 'jinlong85@qq.com',
    // QQ邮箱授权码需要单独设置
    auth: {
      user: 'jinlong85@qq.com',
      pass: 'gxinridbevfvcahi' // QQ邮箱授权码
    }
  },

  // 邮件发送时间（北京时间）
  scheduleTimes: ['09:00', '20:00'],

  // 日志目录
  logDir: '/home/jinlong/CC_TEST/logs'
};

// 确保日志目录存在
if (!fs.existsSync(CONFIG.logDir)) {
  fs.mkdirSync(CONFIG.logDir, { recursive: true });
}

const logFile = path.join(CONFIG.logDir, `wechat-report-${new Date().toISOString().slice(0,10)}.log`);

function log(msg) {
  const time = new Date().toISOString();
  const line = `[${time}] ${msg}`;
  console.log(line);
  fs.appendFileSync(logFile, line + '\n');
}

/**
 * 扫描目录下当天的日报文件
 * 支持多种格式：Word(.doc/.docx)、Excel(.xlsx/.xls)、PDF(.pdf)
 * 匹配文件名中包含今天的日期（多种格式）
 */
function scanTodayFiles() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  // 多种日期格式
  const dateFormats = [
    `${year}-${month}-${day}`,      // 2026-03-23
    `${year}${month}${day}`,         // 20260323
    `${year}年${month}月${day}日`    // 2026年03月23日
  ];

  log(`扫描目录: ${CONFIG.watchDir}`);
  log(`查找日期格式: ${dateFormats.join(', ')}`);

  if (!fs.existsSync(CONFIG.watchDir)) {
    log(`错误: 目录不存在 ${CONFIG.watchDir}`);
    return [];
  }

  // 支持的文件类型
  const supportedExt = ['.docx', '.doc', '.xlsx', '.xls', '.pdf'];
  const todayFiles = [];

  // 遍历所有子目录
  const entries = fs.readdirSync(CONFIG.watchDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const subDir = path.join(CONFIG.watchDir, entry.name);
    log(`检查子目录: ${entry.name}`);

    try {
      const files = fs.readdirSync(subDir);

      for (const file of files) {
        // 检查扩展名
        const ext = path.extname(file).toLowerCase();
        if (!supportedExt.includes(ext)) continue;

        // 检查日期是否匹配
        const isToday = dateFormats.some(fmt => file.includes(fmt));
        if (!isToday) continue;

        const filePath = path.join(subDir, file);
        const stat = fs.statSync(filePath);

        if (stat.isFile()) {
          log(`找到今日文件: ${file}`);
          todayFiles.push(filePath);
        }
      }
    } catch (err) {
      log(`读取子目录 ${entry.name} 失败: ${err.message}`);
    }
  }

  log(`共找到 ${todayFiles.length} 个今日日报文件`);
  return todayFiles;
}

/**
 * 读取文件内容（支持Word、Excel）
 */
async function readFileContent(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  try {
    log(`读取文件: ${filePath} (${ext})`);

    if (ext === '.docx' || ext === '.doc') {
      // Word文档
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (ext === '.pdf') {
      // PDF文档 - 暂不支持，跳过
      log(`PDF文件跳过: ${filePath}`);
      return '[PDF文件 - 内容无法提取]';
    } else if (ext === '.xlsx' || ext === '.xls') {
      // Excel文档
      const workbook = XLSX.readFile(filePath);
      let content = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        content += `=== 工作表: ${sheetName} ===\n`;
        content += XLSX.utils.sheet_to_csv(sheet) + '\n';
      }
      return content;
    }

    return null;
  } catch (err) {
    log(`读取失败 ${filePath}: ${err.message}`);
    return null;
  }
}

/**
 * 提取工作重点（完整解析日报内容，不精简）
 */
function extractKeyPoints(content) {
  if (!content) return { sections: [], stats: {}, header: {} };

  // 提取基本信息
  const headerMatch = content.match(/日期[：:]\s*(\d+年\d+月\d+日)[^\n]*天气[：:]\s*([^\n]+)/);
  const tempMatch = content.match(/气温[：:]\s*([^\n]+)/);
  const header = {
    date: headerMatch ? headerMatch[1] : '',
    weather: headerMatch ? headerMatch[2] : '',
    temp: tempMatch ? tempMatch[1] : ''
  };

  const sections = [];

  // ==================== 施工板块 ====================
  const constructionSection = extractConstructionSection(content);
  if (constructionSection.items.length > 0 || constructionSection.rawText) {
    sections.push(constructionSection);
  }

  // ==================== 技术板块 ====================
  const techSection = extractTechSection(content);
  if (techSection.items.length > 0) {
    sections.push(techSection);
  }

  // ==================== 环水保工作 ====================
  const envSection = extractEnvSection(content);
  if (envSection.items.length > 0) {
    sections.push(envSection);
  }

  // ==================== 需协调事项 ====================
  const issueSection = extractIssueSection(content);
  sections.push(issueSection);

  // ==================== 统计数据 ====================
  const stats = {
    hasIssues: issueSection.items.length > 0 && issueSection.items[0].status !== '✓ 正常',
    sectionsCount: sections.length,
    planTotal: techSection.totalCount || 0,
    planApproved: techSection.approvedCount || 0,
    planPending: techSection.pendingCount || 0
  };

  return { sections, stats, header };
}

/**
 * 提取施工板块 - 完整内容
 */
function extractConstructionSection(content) {
  const items = [];

  // 提取炸药库施工完整段落
  if (content.includes('炸药库施工')) {
    const match = content.match(/炸药库施工情况([\s\S]*?)(?=2、|二、|三、|$)/);
    if (match) {
      const text = match[1].replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      items.push({
        name: '炸药库施工',
        content: text,
        progress: '进行中'
      });
    }
  }

  // 提取首开区营地完整段落
  if (content.includes('首开区营地')) {
    const match = content.match(/首开区营地施工情况([\s\S]*?)(?=3、|迎检外业|二、|$)/);
    if (match) {
      let text = match[1].replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      // 包含资源投入
      const resourceMatch = text.match(/资源投入情况[：:]([^"]+?)(?=资源投入|$)/);
      if (resourceMatch) {
        text += ' [资源投入: ' + resourceMatch[1].trim() + ']';
      }
      items.push({
        name: '首开区营地施工',
        content: text,
        progress: '进行中'
      });
    }
  }

  // 提取迎检外业完整段落
  if (content.includes('迎检外业工作情况')) {
    const match = content.match(/迎检外业工作情况([\s\S]*?)(?=二、|三、|四、|$)/);
    if (match) {
      let text = match[1].replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      const resourceMatch = text.match(/资源投入情况[：:]([^"]+?)$/);
      if (resourceMatch) {
        text = text.replace(/资源投入情况[：:][^"]+?$/, '').trim();
        text += ' [资源投入: ' + resourceMatch[1].trim() + ']';
      }
      items.push({
        name: '迎检外业工作情况',
        content: text,
        progress: '进行中'
      });
    }
  }

  return {
    title: '一、施工板块',
    items,
    type: 'construction'
  };
}

/**
 * 提取技术板块（施工方案）- 完整清单
 */
function extractTechSection(content) {
  const items = [];

  // 提取施工方案清单表格区域
  const techMatch = content.match(/施工方案清单([\s\S]*?)(?=二、环水保|三、需协调|施工形象|$)/);
  if (techMatch) {
    const tableText = techMatch[1];

    // 按行分析，提取序号、方案名、类型、计划时间、状态
    const lines = tableText.split('\n').filter(l => l.trim());

    let currentItem = null;
    let currentText = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 匹配序号行 (1, 2, 3...)
      const numMatch = trimmed.match(/^(\d+)\s*$/);
      if (numMatch) {
        if (currentItem) items.push(currentItem);
        currentItem = { num: numMatch[1], name: '', type: '', planDate: '', status: '', statusType: 'pending' };
        currentText = '';
        continue;
      }

      // 如果有当前item，累加文本
      if (currentItem) {
        currentText += ' ' + trimmed;

        // 判断状态
        if (trimmed.includes('已批复')) {
          currentItem.status = '已批复';
          currentItem.statusType = 'completed';
        } else if (trimmed.includes('已完成')) {
          currentItem.status = '已完成';
          currentItem.statusType = 'completed';
        } else if (trimmed.includes('监理审批中') || trimmed.includes('审批中')) {
          currentItem.status = '监理审批中';
          currentItem.statusType = 'progress';
        } else if (trimmed.includes('编制中')) {
          currentItem.status = '编制中';
          currentItem.statusType = 'pending';
        } else if (trimmed.includes('修改中')) {
          currentItem.status = '修改中';
          currentItem.statusType = 'pending';
        } else if (trimmed.includes('已提交')) {
          currentItem.status = '已提交';
          currentItem.statusType = 'progress';
        }

        // 判断类型
        if (trimmed.includes('重大')) currentItem.type = '重大';
        else if (trimmed.includes('超危大')) currentItem.type = '超危大';
        else if (trimmed.includes('危大')) currentItem.type = '危大';
        else if (trimmed.includes('一般')) currentItem.type = '一般';
      }
    }
    if (currentItem) items.push(currentItem);
  }

  // 如果没找到表格，用简单方式提取
  if (items.length === 0) {
    const planMatches = content.matchAll(/(\d+)\s+([^\n]+?)\s*\n([^\n]*?)\s*\n(重大|超危大|危大|一般)?[^\n]*\s*\n([^\n]+?)\s*\n([^\n]+)/g);
    for (const match of planMatches) {
      const status = match[6] || match[5];
      let statusType = 'pending';
      if (status.includes('已批复') || status.includes('已完成')) statusType = 'completed';
      else if (status.includes('审批中') || status.includes('已提交')) statusType = 'progress';

      items.push({
        num: match[1],
        name: match[2].trim(),
        type: match[4] || '',
        planDate: match[3].trim(),
        status: status.trim(),
        statusType
      });
    }
  }

  // 统计
  const approvedCount = items.filter(i => i.statusType === 'completed').length;
  const pendingCount = items.filter(i => i.statusType !== 'completed').length;

  return {
    title: '二、技术板块（施工方案）',
    items,
    totalCount: items.length,
    approvedCount,
    pendingCount,
    type: 'tech'
  };
}

/**
 * 提取环水保工作 - 完整任务分解
 */
function extractEnvSection(content) {
  const items = [];

  // 提取环保迎检工作任务分解区域
  if (content.includes('环保迎检工作任务分解')) {
    const envMatch = content.match(/环保迎检工作任务分解([\s\S]*?)(?=三、需协调|施工形象|$)/);
    if (envMatch) {
      const envText = envMatch[1];

      // 按年份+责任人分解
      const yearBlocks = envText.split(/(202[345]\d(?=龙军飞|刘金平|涂超|易雷))/g);

      // 提取每个责任人的任务
      const leaderMatches = envText.matchAll(/(龙军飞|刘金平|涂超|易雷)\s+(\d{4})\s+([^\n]+?)\s+([^\n]+?)\s+((?:已完成|明日完成|进行中))/g);

      for (const match of leaderMatches) {
        const leader = match[1];
        const year = match[2];
        const task = match[3].trim();
        const work = match[4].trim();
        const status = match[5];

        items.push({
          leader,
          year,
          task: task + ' - ' + work,
          status,
          statusType: status.includes('已完成') ? 'completed' : 'pending'
        });
      }
    }
  }

  return {
    title: '三、环水保工作',
    items,
    totalCount: items.length,
    doneCount: items.filter(i => i.statusType === 'completed').length,
    type: 'env'
  };
}

/**
 * 提取需协调事项 - 完整内容
 */
function extractIssueSection(content) {
  const items = [];

  // 提取"需协调解决的事项及存在的问题"段落
  const issueMatch = content.match(/需协调解决的事项及存在的问题[：:]*\s*([\s\S]*?)(?=四、|施工形象|图\d|$)/);

  if (issueMatch && issueMatch[1]) {
    const text = issueMatch[1].replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text.includes('无') && text.length > 5) {
      items.push({
        name: text,
        status: '⚠️ 待解决',
        statusType: 'warning'
      });
    } else {
      items.push({
        name: '无',
        status: '✓ 正常',
        statusType: 'completed'
      });
    }
  } else {
    items.push({
      name: '无',
      status: '✓ 正常',
      statusType: 'completed'
    });
  }

  return {
    title: '四、需协调事项',
    items,
    type: 'issue'
  };
}

/**
 * 生成专业HTML报告
 */
function generateReport(filesContent) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const hour = now.getHours();
  const timeLabel = hour < 12 ? '上午9点' : '晚上8点';

  if (filesContent.length === 0) {
    return {
      text: '今日无新日报',
      html: '<html><body style="font-family:Microsoft YaHei;padding:40px;text-align:center;"><h2>今日无新日报</h2><p>暂无新的日报文件。</p></body></html>'
    };
  }

  // 收集所有内容
  let allSections = [];
  let allStats = { hasIssues: false, sectionsCount: 0, planTotal: 0, planApproved: 0, planPending: 0 };

  filesContent.forEach(item => {
    const parsed = extractKeyPoints(item.content);
    allSections.push(...parsed.sections);
    if (parsed.stats.hasIssues) allStats.hasIssues = true;
    allStats.sectionsCount += parsed.sections.length;
    if (parsed.stats.planTotal) {
      allStats.planTotal += parsed.stats.planTotal;
      allStats.planApproved += parsed.stats.planApproved;
      allStats.planPending += parsed.stats.planPending;
    }
  });

  // 构建各板块HTML
  const sectionsHtml = allSections.map(sec => {
    if (sec.type === 'construction') {
      return buildConstructionHtml(sec);
    } else if (sec.type === 'tech') {
      return buildTechHtml(sec);
    } else if (sec.type === 'env') {
      return buildEnvHtml(sec);
    } else if (sec.type === 'issue') {
      return buildIssueHtml(sec);
    }
    return '';
  }).join('');

  // 生成HTML报告
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Microsoft YaHei', Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; background: #f0f2f5; }
  .card { background: white; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); margin-bottom: 20px; overflow: hidden; }

  .header { background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%); color: white; padding: 28px 32px; }
  .header h1 { margin: 0 0 10px 0; font-size: 20px; font-weight: 600; letter-spacing: 1px; }
  .header .meta { font-size: 14px; opacity: 0.9; }
  .header .time { display: inline-block; background: rgba(255,255,255,0.2); padding: 5px 14px; border-radius: 20px; margin-top: 12px; font-size: 13px; }

  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 20px 24px; background: #f8f9fa; }
  .stat-card { background: white; padding: 16px; border-radius: 10px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
  .stat-card .number { font-size: 26px; font-weight: 700; }
  .stat-card .label { color: #666; font-size: 12px; margin-top: 6px; }
  .stat-card.blue .number { color: #1565c0; }
  .stat-card.green .number { color: #2e7d32; }
  .stat-card.orange .number { color: #e65100; }
  .stat-card.red .number { color: #c62828; }

  .section { padding: 24px 28px; border-bottom: 1px solid #eee; }
  .section:last-child { border-bottom: none; }

  .section-header { display: flex; align-items: center; margin-bottom: 18px; }
  .section-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; margin-right: 12px; }
  .section-icon.construction { background: #e3f2fd; }
  .section-icon.tech { background: #f3e5f5; }
  .section-icon.env { background: #e8f5e9; }
  .section-icon.issue { background: #ffebee; }
  .section-title { font-size: 16px; font-weight: 600; color: #333; }
  .section-badge { margin-left: auto; background: #f0f0f0; padding: 4px 10px; border-radius: 12px; font-size: 12px; color: #666; }

  .work-item { background: #f8f9fa; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; }
  .work-item:last-child { margin-bottom: 0; }
  .work-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .work-item-name { font-weight: 600; color: #333; font-size: 14px; }
  .work-item-status { padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
  .work-item-status.done { background: #e8f5e9; color: #2e7d32; }
  .work-item-status.progress { background: #fff3e0; color: #e65100; }
  .work-item-status.pending { background: #e3f2fd; color: #1565c0; }
  .work-item-status.warning { background: #ffebee; color: #c62828; }
  .work-item-content { color: #555; font-size: 13px; line-height: 1.6; padding-left: 4px; }
  .work-item-leader { color: #888; font-size: 12px; margin-top: 6px; }

  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f5f5f5; color: #555; font-weight: 600; text-align: left; padding: 10px 12px; border-bottom: 2px solid #e0e0e0; }
  td { padding: 10px 12px; border-bottom: 1px solid #eee; color: #333; }
  tr:last-child td { border-bottom: none; }
  tr:hover { background: #f8f9fa; }

  .progress-bar { width: 100%; height: 6px; background: #e0e0e0; border-radius: 3px; margin-top: 8px; }
  .progress-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #4caf50, #66bb6a); }

  .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
  .file-list { background: #f8f9fa; padding: 16px 24px; border-radius: 8px; margin-top: 16px; }
  .file-list h4 { margin: 0 0 8px 0; color: #666; font-size: 13px; font-weight: 500; }
  .file-list ul { margin: 0; padding-left: 20px; color: #555; font-size: 13px; }
</style>
</head>
<body>

<div class="card">
  <div class="header">
    <h1>📋 西藏八宿卡瓦白庆抽水蓄能电站补充勘探建设项目</h1>
    <div class="meta">安环部工作日报 · ${timeLabel}定时推送</div>
    <div class="time">📅 ${dateStr}</div>
  </div>
</div>

<div class="summary">
  <div class="stat-card blue">
    <div class="number">${filesContent.length}</div>
    <div class="label">收到日报</div>
  </div>
  <div class="stat-card green">
    <div class="number">${allStats.planApproved}</div>
    <div class="label">方案已批复</div>
  </div>
  <div class="stat-card orange">
    <div class="number">${allStats.planPending}</div>
    <div class="label">方案审批中</div>
  </div>
  <div class="stat-card ${allStats.hasIssues ? 'red' : 'green'}">
    <div class="number">${allStats.hasIssues ? '⚠️ 有' : '✓ 无'}</div>
    <div class="label">协调事项</div>
  </div>
</div>

<div class="card">
  ${sectionsHtml}
</div>

<div class="file-list">
  <h4>📁 原始文件</h4>
  <ul>
    ${filesContent.map(f => `<li>${f.filename}</li>`).join('')}
  </ul>
</div>

<div class="footer">
  本报告由自动脚本生成 | 西藏八宿卡瓦白庆抽水蓄能电站安环部
</div>

</body>
</html>`;

  // 纯文本版本
  let text = `【工作日报重点汇总】${dateStr} ${timeLabel}\n`;
  text += '='.repeat(55) + '\n\n';

  allSections.forEach(sec => {
    text += `\n【${sec.title}】\n`;
    text += '-'.repeat(40) + '\n';
    sec.items.forEach(item => {
      text += `  ▶ ${item.name}\n`;
      if (item.content) text += `    内容: ${item.content}\n`;
      text += `    状态: ${item.status}\n`;
      if (item.leader) text += `    责任人: ${item.leader}\n`;
    });
    text += '\n';
  });

  return { text, html };
}

/**
 * 构建施工板块HTML
 */
function buildConstructionHtml(section) {
  return `
  <div class="section">
    <div class="section-header">
      <div class="section-icon construction">🏗️</div>
      <div class="section-title">${section.title}</div>
    </div>
    ${section.items.map(item => `
    <div class="work-item">
      <div class="work-item-header">
        <div class="work-item-name">${item.name}</div>
        <div class="work-item-status ${item.progress === '进行中' ? 'progress' : 'done'}">${item.progress}</div>
      </div>
      <div class="work-item-content">${item.content || '正常施工中'}</div>
    </div>
    `).join('')}
  </div>`;
}

/**
 * 构建技术板块HTML
 */
function buildTechHtml(section) {
  const approvedPct = section.totalCount > 0 ? Math.round(section.approvedCount / section.totalCount * 100) : 0;

  return `
  <div class="section">
    <div class="section-header">
      <div class="section-icon tech">📝</div>
      <div class="section-title">${section.title}</div>
      <div class="section-badge">${section.totalCount}项 / 已批复${section.approvedCount}项</div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:5%">#</th>
          <th style="width:50%">方案名称</th>
          <th style="width:20%">类型</th>
          <th style="width:25%">状态</th>
        </tr>
      </thead>
      <tbody>
        ${section.items.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.name}</td>
          <td>-</td>
          <td><span class="work-item-status ${item.statusType}">${item.status}</span></td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="progress-bar"><div class="progress-fill" style="width:${approvedPct}%"></div></div>
  </div>`;
}

/**
 * 构建环水保板块HTML
 */
function buildEnvHtml(section) {
  return `
  <div class="section">
    <div class="section-header">
      <div class="section-icon env">🌿</div>
      <div class="section-title">${section.title}</div>
      <div class="section-badge">${section.doneCount}/${section.totalCount} 完成</div>
    </div>
    ${section.items.map(item => `
    <div class="work-item">
      <div class="work-item-header">
        <div class="work-item-name">${item.name}</div>
        <div class="work-item-status ${item.statusType}">${item.status}</div>
      </div>
      ${item.leader ? `<div class="work-item-leader">责任人: ${item.leader}</div>` : ''}
    </div>
    `).join('')}
  </div>`;
}

/**
 * 构建问题板块HTML
 */
function buildIssueHtml(section) {
  const item = section.items[0];
  const hasIssue = item.statusType === 'warning';

  return `
  <div class="section">
    <div class="section-header">
      <div class="section-icon issue">⚠️</div>
      <div class="section-title">${section.title}</div>
    </div>
    <div class="work-item" style="background: ${hasIssue ? '#ffebee' : '#e8f5e9'}; border-left: 4px solid ${hasIssue ? '#c62828' : '#2e7d32'};">
      <div class="work-item-content" style="font-size: 14px; font-weight: 500;">
        ${item.name === '无' ? '✓ 今日无协调事项，工作正常' : item.name}
      </div>
    </div>
  </div>`;
}

/**
 * 发送邮件
 */
async function sendEmail(report) {
  const transporter = nodemailer.createTransport({
    service: 'qq',
    auth: {
      user: CONFIG.email.auth.user,
      pass: CONFIG.email.auth.pass
    }
  });

  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const hour = now.getHours();
  const timeLabel = hour < 12 ? '上午9点' : '晚上8点';

  const mailOptions = {
    from: CONFIG.email.from,
    to: CONFIG.email.to,
    subject: `【日报重点】${dateStr} ${timeLabel}工作汇总`,
    text: report.text,
    html: report.html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    log(`邮件发送成功: ${info.response}`);
    return true;
  } catch (err) {
    log(`邮件发送失败: ${err.message}`);
    return false;
  }
}

/**
 * 主流程
 */
async function runDailyReport() {
  log('========== 开始日报处理 ==========');

  try {
    // 1. 扫描今日文件
    const todayFiles = scanTodayFiles();

    // 2. 读取文件内容
    const filesContent = [];
    for (const filePath of todayFiles) {
      const content = await readFileContent(filePath);
      if (content) {
        const { summary, keyLines } = extractKeyPoints(content);
        filesContent.push({
          filename: path.basename(filePath),
          filepath: filePath,
          content,
          summary,
          keyLines
        });
      }
    }

    // 3. 生成报告
    const report = generateReport(filesContent);
    log(`报告已生成，共 ${filesContent.length} 份日报`);

    // 4. 发送邮件
    const sent = await sendEmail(report);
    if (sent) {
      log('========== 推送成功 ==========');
    } else {
      log('========== 推送失败 ==========');
    }

    return sent;
  } catch (err) {
    log(`处理异常: ${err.message}`);
    log('========== 处理异常 ==========');
    return false;
  }
}

/**
 * 配置定时任务
 */
function setupCronJobs() {
  log('配置定时任务: 早上9:00 和 晚上20:00');

  // node-cron 使用北京时间需要考虑时区
  // 这里使用UTC时间：北京时间9点 = UTC 1点，北京时间20点 = UTC 12点
  const jobs = [
    '0 1 * * *',  // UTC 1点 = 北京时间 9点
    '0 12 * * *'  // UTC 12点 = 北京时间 20点
  ];

  jobs.forEach((cronExpr, idx) => {
    const timeLabel = idx === 0 ? '北京时间9点' : '北京时间20点';
    nodeCron.schedule(cronExpr, () => {
      log(`触发定时任务: ${timeLabel}`);
      runDailyReport();
    }, {
      timezone: 'Asia/Shanghai'
    });
    log(`已设置定时任务: ${timeLabel} (${cronExpr})`);
  });
}

/**
 * 初始化
 */
async function init() {
  log('微信日报监控脚本启动');

  // 检查配置
  if (CONFIG.email.auth.pass === 'YOUR_AUTH_CODE') {
    log('警告: 请先配置QQ邮箱授权码!');
    log('设置方法: https://mail.qq.com -> 设置 -> 账户 -> POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务 -> 开启IMAP/SMTP服务 -> 获取授权码');
    log('然后修改脚本中的 auth.pass 配置项');
  }

  // 配置定时任务
  setupCronJobs();

  // 是否立即执行一次（用于测试）
  const args = process.argv.slice(2);
  if (args.includes('--now')) {
    log('立即执行一次...');
    await runDailyReport();
  } else {
    log('定时任务已配置，等待触发...');
  }
}

// 导出函数供测试用
module.exports = { runDailyReport, scanTodayFiles, readFileContent, extractKeyPoints, generateReport };

// 运行
init();
