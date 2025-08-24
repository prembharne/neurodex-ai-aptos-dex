const http = require('http');

console.log('🚀 Starting debug server...');

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('Stack:', err.stack);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  console.error('Stack:', err.stack);
});

// Create server with error handling
const server = http.createServer((req, res) => {
  console.log(`📡 ${req.method} ${req.url}`);
  
  try {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        ok: true, 
        provider: 'debug', 
        timestamp: new Date().toISOString() 
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  } catch (err) {
    console.error('❌ Request error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal error');
  }
});

// Server error handling
server.on('error', (err) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error('Port 3005 is already in use');
  } else if (err.code === 'EACCES') {
    console.error('Permission denied for port 3005');
  }
});

server.on('listening', () => {
  console.log('✅ Server successfully listening on port 3005');
  console.log('🌐 Test URL: http://localhost:3005/health');
});

server.on('close', () => {
  console.log('⚠️ Server closed');
});

// Start server
console.log('🔧 Attempting to bind to port 3005 on all interfaces...');
server.listen(3005, '0.0.0.0', () => {
  console.log('🎉 Server started successfully on 0.0.0.0:3005!');
  
  // Keep the process alive and log periodically
  setInterval(() => {
    console.log('💓 Server heartbeat - still alive at', new Date().toLocaleTimeString());
  }, 5000);
});

console.log('📝 Server setup complete, waiting for binding...');
