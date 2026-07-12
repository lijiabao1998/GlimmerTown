const http = require('http');
const fs = require('fs');
const path = require('path');
const server = http.createServer((req, res) => {
  let file = req.url === '/' ? '/index.html' : req.url;
  try {
    let data = fs.readFileSync(path.join(process.cwd(), file));
    let ct = file.endsWith('.js') ? 'application/javascript' : 'text/html';
    res.writeHead(200, { 'Content-Type': ct });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end();
  }
});
server.listen(8080);
console.log('http://localhost:8080');
