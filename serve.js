/* POC 미리보기용 정적 파일 서버 — node serve.js [port] */
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.argv[2] || 8942);
const root = __dirname;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(root, rel);
  if (!file.startsWith(root)) { res.writeHead(403).end('forbidden'); return; }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (e, buf) => {
      if (e) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 ' + rel); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(buf);
    });
  });
}).listen(port, () => console.log('static server on http://localhost:' + port));
