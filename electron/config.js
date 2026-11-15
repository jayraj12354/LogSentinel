module.exports = {
  appName: 'LogSentinel',
  port: 4000,
  vitePort: 5173,
  apiBase: 'http://localhost:4000/api/v1',
  // Read once at startup: the embedded server's dotenv later sets NODE_ENV=development from .env.
  useVite: process.env.NODE_ENV === 'development' && !require('electron').app.isPackaged,
};
