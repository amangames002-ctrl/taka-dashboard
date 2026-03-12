// Taka Token 消耗量統計後端
// 用於收集和提供 token 使用量數據

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'token-usage.json');
const HISTORY_FILE = path.join(__dirname, 'token-history.json');

// 初始化數據文件
function initDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      totalUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0
      },
      byModel: {},
      byProvider: {},
      byDate: {},
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
  
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2));
  }
}

// 讀取當前數據
function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    initDataFile();
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }
}

// 寫入數據
function writeData(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// 添加使用記錄
function addUsageRecord(record) {
  const data = readData();
  const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  
  const {
    model,
    provider,
    inputTokens,
    outputTokens,
    cost,
    timestamp = new Date().toISOString()
  } = record;
  
  const date = new Date(timestamp).toISOString().split('T')[0];
  
  // 更新總計
  data.totalUsage.inputTokens += inputTokens;
  data.totalUsage.outputTokens += outputTokens;
  data.totalUsage.totalCost += (cost || 0);
  
  // 按模型統計
  if (!data.byModel[model]) {
    data.byModel[model] = { inputTokens: 0, outputTokens: 0, count: 0, cost: 0 };
  }
  data.byModel[model].inputTokens += inputTokens;
  data.byModel[model].outputTokens += outputTokens;
  data.byModel[model].count += 1;
  data.byModel[model].cost += (cost || 0);
  
  // 按提供商統計
  if (!data.byProvider[provider]) {
    data.byProvider[provider] = { inputTokens: 0, outputTokens: 0, count: 0, cost: 0 };
  }
  data.byProvider[provider].inputTokens += inputTokens;
  data.byProvider[provider].outputTokens += outputTokens;
  data.byProvider[provider].count += 1;
  data.byProvider[provider].cost += (cost || 0);
  
  // 按日期統計
  if (!data.byDate[date]) {
    data.byDate[date] = { inputTokens: 0, outputTokens: 0, count: 0, cost: 0 };
  }
  data.byDate[date].inputTokens += inputTokens;
  data.byDate[date].outputTokens += outputTokens;
  data.byDate[date].count += 1;
  data.byDate[date].cost += (cost || 0);
  
  // 添加到歷史記錄
  history.push({
    model,
    provider,
    inputTokens,
    outputTokens,
    cost,
    timestamp
  });
  
  // 保留最近 10000 筆記錄
  if (history.length > 10000) {
    history.splice(0, history.length - 10000);
  }
  
  writeData(data);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  
  return data;
}

// 獲取統計數據
function getStats(period = 'all') {
  const data = readData();
  const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  const now = new Date();
  
  let filteredHistory = history;
  
  if (period === 'today') {
    const today = now.toISOString().split('T')[0];
    filteredHistory = history.filter(h => h.timestamp.startsWith(today));
  } else if (period === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filteredHistory = history.filter(h => new Date(h.timestamp) >= weekAgo);
  } else if (period === 'month') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    filteredHistory = history.filter(h => new Date(h.timestamp) >= monthAgo);
  }
  
  // 重新計算統計數據
  const stats = {
    totalUsage: { inputTokens: 0, outputTokens: 0, totalCost: 0 },
    byModel: {},
    byProvider: {},
    byDate: {},
    lastUpdated: data.lastUpdated
  };
  
  filteredHistory.forEach(record => {
    const { model, provider, inputTokens, outputTokens, cost, timestamp } = record;
    const date = timestamp.split('T')[0];
    
    stats.totalUsage.inputTokens += inputTokens;
    stats.totalUsage.outputTokens += outputTokens;
    stats.totalUsage.totalCost += (cost || 0);
    
    if (!stats.byModel[model]) {
      stats.byModel[model] = { inputTokens: 0, outputTokens: 0, count: 0, cost: 0 };
    }
    stats.byModel[model].inputTokens += inputTokens;
    stats.byModel[model].outputTokens += outputTokens;
    stats.byModel[model].count += 1;
    stats.byModel[model].cost += (cost || 0);
    
    if (!stats.byProvider[provider]) {
      stats.byProvider[provider] = { inputTokens: 0, outputTokens: 0, count: 0, cost: 0 };
    }
    stats.byProvider[provider].inputTokens += inputTokens;
    stats.byProvider[provider].outputTokens += outputTokens;
    stats.byProvider[provider].count += 1;
    stats.byProvider[provider].cost += (cost || 0);
    
    if (!stats.byDate[date]) {
      stats.byDate[date] = { inputTokens: 0, outputTokens: 0, count: 0, cost: 0 };
    }
    stats.byDate[date].inputTokens += inputTokens;
    stats.byDate[date].outputTokens += outputTokens;
    stats.byDate[date].count += 1;
    stats.byDate[date].cost += (cost || 0);
  });
  
  return stats;
}

// HTTP Server (簡單的靜態文件服務 + API)
const http = require('http');

function startServer(port = 3000) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // API 路由
    if (url.pathname === '/api/stats') {
      const period = url.searchParams.get('period') || 'all';
      const stats = getStats(period);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats));
      return;
    }
    
    if (url.pathname === '/api/add-usage' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const record = JSON.parse(body);
          const data = addUsageRecord(record);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, data }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
    
    if (url.pathname === '/api/data') {
      const data = readData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }
    
    // 靜態文件服務
    let filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);
    
    const extname = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg'
    };
    
    const contentType = contentTypes[extname] || 'text/plain';
    
    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.writeHead(404);
          res.end('File not found');
        } else {
          res.writeHead(500);
          res.end('Server error');
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
  
  server.listen(port, () => {
    console.log(`Taka Dashboard Server running at http://localhost:${port}`);
  });
}

// 命令行接口
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'init') {
    initDataFile();
    console.log('Data file initialized');
  } else if (args[0] === 'stats') {
    const stats = getStats(args[1] || 'all');
    console.log(JSON.stringify(stats, null, 2));
  } else if (args[0] === 'server') {
    const port = parseInt(args[1]) || 3000;
    initDataFile();
    startServer(port);
  } else {
    console.log('Usage:');
    console.log('  node taka-stats.js init          - Initialize data file');
    console.log('  node taka-stats.js stats [period] - Show stats (period: today/week/month/all)');
    console.log('  node taka-stats.js server [port]  - Start HTTP server');
  }
}

module.exports = { initDataFile, readData, writeData, addUsageRecord, getStats, startServer };
