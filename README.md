# Taka 消耗量儀表板

📊 實時監控所有 AI 模型的 Token 使用量和成本統計

## 功能特點

- ✅ **多維度統計**: 按模型、提供商、日期分類統計
- ✅ **時間範圍**: 支持今日、本週、本月、全部時間範圍
- ✅ **實時更新**: 每 5 分鐘自動刷新數據
- ✅ **美觀界面**: 響應式設計，支持桌面和移動設備
- ✅ **免費部署**: 可部署到 GitHub Pages、Vercel 等免費平台

## 快速開始

### 本地運行

```bash
cd taka-dashboard

# 初始化數據文件
node taka-stats.js init

# 啟動服務器（默认端口 3000）
node taka-stats.js server

# 或使用自定義端口
node taka-stats.js server 8080
```

然後訪問 `http://localhost:3000`

### API 端點

- `GET /api/stats?period=today|week|month|all` - 獲取統計數據
- `GET /api/data` - 獲取原始數據
- `POST /api/add-usage` - 添加使用記錄

### 添加使用記錄範例

```javascript
fetch('/api/add-usage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'nvidia/qwen3.5-397b',
    provider: 'nvidia',
    inputTokens: 1500,
    outputTokens: 800,
    cost: 0.05,
    timestamp: new Date().toISOString()
  })
});
```

## 部署到 GitHub Pages

1. 將此倉庫 push 到 GitHub
2. 啟用 GitHub Pages (Settings > Pages)
3. 選擇 main branch 作為來源
4. 訪問提供的 URL

## 部署到 Vercel

```bash
npm i -g vercel
vercel
```

## 數據文件

- `token-usage.json` - 匯總統計數據
- `token-history.json` - 歷史記錄（最近 10000 筆）

## 集成到 OpenClaw

在 OpenClaw 中自動記錄 token 使用量：

```javascript
// 在 OpenClaw hook 中添加
const recordTokenUsage = async (model, provider, input, output) => {
  await fetch('http://localhost:3000/api/add-usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      provider,
      inputTokens: input,
      outputTokens: output,
      cost: calculateCost(model, input, output),
      timestamp: new Date().toISOString()
    })
  });
};
```

## License

MIT
