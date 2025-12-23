const express = require("express");
const app = express();
const axios = require("axios");
const os = require('os');
const fs = require("fs");
const path = require("path");
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const { execSync } = require('child_process');

// --- 环境变量与配置 ---
const API_ENDPOINT = process.env.API_ENDPOINT || '';
const SERVICE_BASE_URL = process.env.SERVICE_BASE_URL || '';
const AUTO_ENABLE = process.env.AUTO_ENABLE || false;
const DATA_DIR = process.env.DATA_DIR || './tmp';
const API_PATH = process.env.API_PATH || 'api/config';
const SERVER_PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const SERVICE_ID = process.env.SERVICE_ID || 'afa95317-a9e2-49d0-bba8-06efb190081a';
const MONITOR_SERVER = process.env.MONITOR_SERVER || 'jk.qianxiu.xx.kg:8008';
const MONITOR_PORT = process.env.MONITOR_PORT || '';
const MONITOR_KEY = process.env.MONITOR_KEY || 'tWSZ7FQDZuV2wlCshjCddTNsV4Fb9Z5p';
const GATEWAY_DOMAIN = process.env.GATEWAY_DOMAIN || 'koyeb1.0407123.xyz';
const GATEWAY_AUTH = process.env.GATEWAY_AUTH || 'eyJhIjoiMTlmOGI1NWVlOGY3NjA4ZmY0YzdmZGY2OTM0YzdmZDciLCJ0IjoiMGVlNjkxYzAtMjYyZS00OGVlLWIzYzYtZmFlOGRiMWJhOGE1IiwicyI6Ik5EVTVORFExWm1VdFpXSmpZaTAwTkRGbExXSmpOV1F0WWpneFpEaG1ZVEpsWm1GaiJ9';
const GATEWAY_PORT = process.env.GATEWAY_PORT || 8003;
const PROXY_HOST = process.env.PROXY_HOST || 'www.visa.cn';
const PROXY_PORT = process.env.PROXY_PORT || 443;
const SERVICE_NAME = process.env.SERVICE_NAME || '';

// --- 内联伪装页面 HTML ---
const LANDING_PAGE_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Home</title>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        :root {
            --bg: #f0f2f5;
            --text: #2d3436;
            --card-bg: rgba(255, 255, 255, 0.8);
            --accent: #6c5ce7;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'PingFang SC', -apple-system, sans-serif;
            background-color: var(--bg);
            background-image: 
                radial-gradient(at 0% 0%, rgba(108, 92, 231, 0.05) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(0, 184, 148, 0.05) 0px, transparent 50%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--text);
        }
        #greeting {
            font-size: 0.9rem;
            letter-spacing: 2px;
            text-transform: uppercase;
            opacity: 0.5;
            margin-bottom: 8px;
        }
        #clock {
            font-size: 4rem;
            font-weight: 700;
            margin-bottom: 40px;
            letter-spacing: -2px;
        }
        .search-container {
            width: 90%;
            max-width: 550px;
            margin-bottom: 60px;
        }
        .search-box {
            width: 100%;
            padding: 20px 30px;
            border: none;
            border-radius: 20px;
            background: var(--card-bg);
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            font-size: 18px;
            outline: none;
            transition: all 0.3s;
            text-align: center;
        }
        .search-box:focus {
            transform: scale(1.02);
            box-shadow: 0 20px 40px rgba(0,0,0,0.08);
            background: #fff;
        }
        .nav-container {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            justify-content: center;
        }
        .nav-item {
            text-decoration: none;
            color: inherit;
            width: 100px;
            height: 100px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: var(--card-bg);
            border-radius: 24px;
            transition: all 0.3s;
        }
        .nav-item:hover {
            background: var(--accent);
            color: white;
            transform: translateY(-10px);
        }
        .nav-item i { margin-bottom: 10px; width: 24px; }
        .nav-item span { font-size: 12px; font-weight: 500; }
    </style>
</head>
<body>
    <div id="greeting">HELLO</div>
    <div id="clock">00:00</div>
    <div class="search-container">
        <form action="https://www.google.com/search" method="get">
            <input type="text" name="q" class="search-box" placeholder="Search..." autofocus autocomplete="off">
        </form>
    </div>
    <div class="nav-container" id="nav">
        <a href="https://github.com" class="nav-item">
            <i data-lucide="github"></i>
            <span>GitHub</span>
        </a>
        <a href="https://notion.so" class="nav-item">
            <i data-lucide="book-open"></i>
            <span>Notion</span>
        </a>
        <a href="https://bilibili.com" class="nav-item">
            <i data-lucide="tv"></i>
            <span>Bilibili</span>
        </a>
    </div>
    <script>
        lucide.createIcons();
        function update() {
            const now = new Date();
            const h = now.getHours();
            const m = String(now.getMinutes()).padStart(2, '0');
            document.getElementById('clock').textContent = h + ":" + m;
            let greet = "Good Evening";
            if (h < 12) greet = "Good Morning";
            else if (h < 18) greet = "Good Afternoon";
            document.getElementById('greeting').textContent = greet;
        }
        setInterval(update, 1000);
        update();
    </script>
</body>
</html>
`;

// --- 目录与文件名初始化 ---
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

function generateRandomName() {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const serviceA = generateRandomName();
const serviceB = generateRandomName();
const gatewayService = generateRandomName();
const monitorService = generateRandomName();
let serviceAPath = path.join(DATA_DIR, serviceA);
let monitorServicePath = path.join(DATA_DIR, monitorService);
let serviceBPath = path.join(DATA_DIR, serviceB);
let gatewayServicePath = path.join(DATA_DIR, gatewayService);
let endpointsPath = path.join(DATA_DIR, 'endpoints.txt');
let inventoryPath = path.join(DATA_DIR, 'inventory.txt');
let serviceLogPath = path.join(DATA_DIR, 'service.log');
let gatewayConfigPath = path.join(DATA_DIR, 'gateway.json');

// --- 路由设置 ---

// 根路由：返回内联伪装页面
app.get("/", function(req, res) {
  res.set('Content-Type', 'text/html');
  res.send(LANDING_PAGE_HTML);
});

// --- 功能函数 ---

function cleanupEndpoints() {
  try {
    if (!API_ENDPOINT) return;
    if (!fs.existsSync(endpointsPath)) return;
    let fileContent = fs.readFileSync(endpointsPath, 'utf-8');
    const decoded = Buffer.from(fileContent, 'base64').toString('utf-8');
    const nodes = decoded.split('\n').filter(line => /(vless|vmess|trojan|hysteria2|tuic):\/\//.test(line));
    if (nodes.length === 0) return;
    axios.post(`${API_ENDPOINT}/api/delete-nodes`, JSON.stringify({ nodes }), { headers: { 'Content-Type': 'application/json' } }).catch(() => null);
  } catch (err) { }
}

function cleanupData() {
  try {
    const files = fs.readdirSync(DATA_DIR);
    files.forEach(file => {
      const filePath = path.join(DATA_DIR, file);
      try {
        if (fs.statSync(filePath).isFile()) fs.unlinkSync(filePath);
      } catch (err) { }
    });
  } catch (err) { }
}

async function buildServiceConfig() {
  const config = {
    log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
    inbounds: [
      { port: GATEWAY_PORT, protocol: 'vless', settings: { clients: [{ id: SERVICE_ID, flow: 'xtls-rprx-vision' }], decryption: 'none', fallbacks: [{ dest: 3001 }, { path: "/api/v1/stream", dest: 3002 }, { path: "/api/v1/channel", dest: 3003 }, { path: "/api/v1/pipe", dest: 3004 }] }, streamSettings: { network: 'tcp' } },
      { port: 3001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: SERVICE_ID }], decryption: "none" }, streamSettings: { network: "tcp", security: "none" } },
      { port: 3002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: SERVICE_ID, level: 0 }], decryption: "none" }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/api/v1/stream" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
      { port: 3003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: SERVICE_ID, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: "/api/v1/channel" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
      { port: 3004, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: SERVICE_ID }] }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/api/v1/pipe" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
    ],
    dns: { servers: ["https+local://8.8.8.8/dns-query"] },
    outbounds: [ { protocol: "freedom", tag: "direct" }, {protocol: "blackhole", tag: "block"} ]
  };
  fs.writeFileSync(gatewayConfigPath, JSON.stringify(config, null, 2));
}

function getArch() {
  const arch = os.arch();
  return (arch === 'arm' || arch === 'arm64' || arch === 'aarch64') ? 'arm' : 'amd';
}

function fetchFile(fileName, fileUrl, callback) {
  const writer = fs.createWriteStream(fileName);
  axios({ method: 'get', url: fileUrl, responseType: 'stream' })
    .then(response => {
      response.data.pipe(writer);
      writer.on('finish', () => {
        writer.close();
        console.log(`Download ${path.basename(fileName)} successfully`);
        callback(null, fileName);
      });
      writer.on('error', err => {
        fs.unlink(fileName, () => { });
        callback(err.message);
      });
    })
    .catch(err => callback(err.message));
}

async function fetchAndStartServices() {  
  const architecture = getArch();
  const filesToDownload = getArchSpecificFiles(architecture);
  if (filesToDownload.length === 0) return;

  const downloadPromises = filesToDownload.map(fileInfo => {
    return new Promise((resolve, reject) => {
      fetchFile(fileInfo.fileName, fileInfo.fileUrl, (err, filePath) => {
        if (err) reject(err); else resolve(filePath);
      });
    });
  });

  try {
    await Promise.all(downloadPromises);
  } catch (err) {
    console.error('Error downloading files:', err);
    return;
  }

  // 授权
  const filesToAuthorize = MONITOR_PORT ? [serviceAPath, serviceBPath, gatewayServicePath] : [monitorServicePath, serviceBPath, gatewayServicePath];
  filesToAuthorize.forEach(p => { if (fs.existsSync(p)) fs.chmodSync(p, 0o775); });

  // 运行 Nezha
  if (MONITOR_SERVER && MONITOR_KEY) {
    if (!MONITOR_PORT) {
      const port = MONITOR_SERVER.includes(':') ? MONITOR_SERVER.split(':').pop() : '';
      const nezhatls = new Set(['443', '8443', '2096', '2087', '2083', '2053']).has(port) ? 'true' : 'false';
      const configYaml = `client_secret: ${MONITOR_KEY}\ndisable_auto_update: true\nserver: ${MONITOR_SERVER}\ntls: ${nezhatls}\nuuid: ${SERVICE_ID}`;
      fs.writeFileSync(path.join(DATA_DIR, 'config.yaml'), configYaml);
      await exec(`nohup ${monitorServicePath} -c "${DATA_DIR}/config.yaml" >/dev/null 2>&1 &`);
    } else {
      let tls = ['443', '8443', '2096', '2087', '2083', '2053'].includes(MONITOR_PORT) ? '--tls' : '';
      await exec(`nohup ${serviceAPath} -s ${MONITOR_SERVER}:${MONITOR_PORT} -p ${MONITOR_KEY} ${tls} --disable-auto-update >/dev/null 2>&1 &`);
    }
  }

  // 运行 Xray
  await exec(`nohup ${serviceBPath} -c ${gatewayConfigPath} >/dev/null 2>&1 &`);

  // 运行 Argo
  if (fs.existsSync(gatewayServicePath)) {
    let args = GATEWAY_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/) ? `tunnel --no-autoupdate --protocol http2 run --token ${GATEWAY_AUTH}` :
               GATEWAY_AUTH.match(/TunnelSecret/) ? `tunnel --config ${DATA_DIR}/tunnel.yml run` :
               `tunnel --no-autoupdate --protocol http2 --logfile ${serviceLogPath} --loglevel info --url http://localhost:${GATEWAY_PORT}`;
    await exec(`nohup ${gatewayServicePath} ${args} >/dev/null 2>&1 &`);
  }
}

function getArchSpecificFiles(architecture) {
  let baseFiles = [
    { fileName: serviceBPath, fileUrl: `https://${architecture === 'arm' ? 'arm64' : 'amd64'}.ssss.nyc.mn/web` },
    { fileName: gatewayServicePath, fileUrl: `https://${architecture === 'arm' ? 'arm64' : 'amd64'}.ssss.nyc.mn/bot` }
  ];
  if (MONITOR_SERVER && MONITOR_KEY) {
    const type = MONITOR_PORT ? 'agent' : 'v1';
    baseFiles.unshift({ fileName: MONITOR_PORT ? serviceAPath : monitorServicePath, fileUrl: `https://${architecture === 'arm' ? 'arm64' : 'amd64'}.ssss.nyc.mn/${type}` });
  }
  return baseFiles;
}

function configureGateway() {
  if (!GATEWAY_AUTH || !GATEWAY_DOMAIN || !GATEWAY_AUTH.includes('TunnelSecret')) return;
  fs.writeFileSync(path.join(DATA_DIR, 'tunnel.json'), GATEWAY_AUTH);
  const yaml = `tunnel: ${GATEWAY_AUTH.split('"')[11]}\ncredentials-file: ${path.join(DATA_DIR, 'tunnel.json')}\nprotocol: http2\ningress:\n  - hostname: ${GATEWAY_DOMAIN}\n    service: http://localhost:${GATEWAY_PORT}\n  - service: http_status:404`;
  fs.writeFileSync(path.join(DATA_DIR, 'tunnel.yml'), yaml);
}

async function extractHostnames() {
  if (GATEWAY_AUTH && GATEWAY_DOMAIN) {
    await generateServiceEndpoints(GATEWAY_DOMAIN);
  } else {
    try {
      if (!fs.existsSync(serviceLogPath)) return;
      const content = fs.readFileSync(serviceLogPath, 'utf-8');
      const match = content.match(/https?:\/\/([^ ]*trycloudflare\.com)\/?/);
      if (match) {
        await generateServiceEndpoints(match[1]);
      } else {
        setTimeout(extractHostnames, 3000);
      }
    } catch (err) { }
  }
}

async function getSystemInfo() {
  try {
    const res = await axios.get('https://ipapi.co/json/', { timeout: 3000 });
    return `${res.data.country_code}_${res.data.org}`;
  } catch (e) { return 'Unknown'; }
}

async function generateServiceEndpoints(argoDomain) {
  const ISP = await getSystemInfo();
  const nodeName = NAME ? `${NAME}-${ISP}` : ISP;
  const VMESS = { v: '2', ps: nodeName, add: CFIP, port: CFPORT, id: UUID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: argoDomain, path: '/vmess-argo?ed=2560', tls: 'tls', sni: argoDomain, fp: 'firefox'};
  const subTxt = `vless://${UUID}@${CFIP}:${CFPORT}?encryption=none&security=tls&sni=${argoDomain}&fp=firefox&type=ws&host=${argoDomain}&path=%2Fvless-argo%3Fed%3D2560#${nodeName}\n\nvmess://${Buffer.from(JSON.stringify(VMESS)).toString('base64')}\n\ntrojan://${UUID}@${CFIP}:${CFPORT}?security=tls&sni=${argoDomain}&fp=firefox&type=ws&host=${argoDomain}&path=%2Ftrojan-argo%3Fed%3D2560#${nodeName}`;
  
  fs.writeFileSync(subPath, Buffer.from(subTxt).toString('base64'));
  
  app.get(`/${SUB_PATH}`, (req, res) => {
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(Buffer.from(subTxt).toString('base64'));
  });
  
  await syncServiceEndpoints();
}

async function syncServiceEndpoints() {
  if (UPLOAD_URL && PROJECT_URL) {
    const jsonData = { subscription: [`${PROJECT_URL}/${SUB_PATH}`] };
    await axios.post(`${UPLOAD_URL}/api/add-subscriptions`, jsonData).catch(() => null);
  }
}

function cleanupServiceFiles() {
  setTimeout(() => {
    const files = [serviceLogPath, gatewayConfigPath, serviceBPath, gatewayServicePath, serviceAPath, monitorServicePath];
    files.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
    console.clear();
    console.log('App is running smoothly.');
  }, 90000);
}

async function initializeService() {
  configureGateway();
  cleanupEndpoints();
  cleanupData();
  await buildServiceConfig();
  await fetchAndStartServices();
  await extractHostnames();
  cleanupServiceFiles();
}

initializeService().catch(console.error);
app.listen(SERVER_PORT, () => console.log(`Server is running on port:${SERVER_PORT}`));
