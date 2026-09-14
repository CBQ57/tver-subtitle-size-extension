const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/demo') {
    const html = fs.readFileSync(path.join(root, 'extension/popup.html'), 'utf8')
      .replace('<head>', '<head><base href="/extension/"><script src="/tests/mock.js"></script>');
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); res.end(html); return;
  }
  const target = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/tests/index.html' : url.pathname));
  if (!target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(target, (error, data) => {
    if (error) { res.writeHead(404); res.end(); return; }
    const type = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png'}[path.extname(target)] || 'text/plain';
    res.writeHead(200, {'Content-Type':type+'; charset=utf-8'}); res.end(data);
  });
}).listen(8137, '127.0.0.1', () => console.log('Test page: http://127.0.0.1:8137'));
