/* 江苏公安信访平台 · 本地静态服务器（零依赖）
   用法：node server.js  （默认端口 8080，可用 PORT 环境变量修改） */
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  const file = path.join(root, url);
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.writeHead(403); res.end('Forbidden');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(process.env.PORT || 8080, '0.0.0.0', () => {
  console.log('江苏公安信访平台已启动：http://localhost:' + (process.env.PORT || 8080));
});
