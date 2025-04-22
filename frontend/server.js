const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// Define backend API URL
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// Setup API proxying
app.use('/api', createProxyMiddleware({ 
  target: BACKEND_URL, 
  changeOrigin: true,
  pathRewrite: {'^/api': ''}
}));

app.use('/auth', createProxyMiddleware({ 
  target: BACKEND_URL, 
  changeOrigin: true 
}));

app.use('/chat', createProxyMiddleware({ 
  target: BACKEND_URL, 
  changeOrigin: true 
}));

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'dist')));

// For any request that doesn't match one above, send back the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API requests proxied to: ${BACKEND_URL}`);
}); 