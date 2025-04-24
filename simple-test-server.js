const http = require('http');

http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Test server working');
}).listen(3000, '0.0.0.0', () => {
  console.log('Test server running at http://0.0.0.0:3000/');
  console.log('Try accessing this from another device on your network');
});