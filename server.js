/**
 * Production Node.js server for Mobilne-3D Platform
 * Deployed on Cyberfolks.pl (s108.cyber-folks.pl - 195.78.66.103)
 * Optimized for Passenger hosting environment
 * 
 * This server serves the built static files from the 'dist' directory
 * and handles client-side routing for the Single Page Application (SPA).
 */

import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Enable gzip compression
app.use(compression());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Force Connection: close dla Passenger - szybsze zwalnianie zasobów
app.use((req, res, next) => {
  // Wymusz zamknięcie połączenia po każdej odpowiedzi
  res.setHeader('Connection', 'close');
  
  res.on('finish', () => {
    // Zniszcz socket natychmiast po zakończeniu
    if (req.socket && !req.socket.destroyed) {
      req.socket.destroy();
    }
  });
  next();
});

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1y', // Cache static assets for 1 year
  etag: true,
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Handle client-side routing (SPA)
// All routes should return index.html to let React Router handle routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
});

// Server instance variable for graceful shutdown
let server;

// Start the server
server = app.listen(PORT, HOST, () => {
  console.log('='.repeat(60));
  console.log('🚀 Mobilne-3D Platform Server (Passenger)');
  console.log('='.repeat(60));
  console.log(`📍 Server running at: http://${HOST}:${PORT}`);
  console.log(`🌐 Host: s108.cyber-folks.pl`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📅 Started at: ${new Date().toLocaleString('pl-PL')}`);
  console.log('='.repeat(60));
});

// Limity dla shared hosting (Passenger)
server.maxConnections = 50;
server.keepAliveTimeout = 5000;  // 5 sekund
server.headersTimeout = 6000;    // 6 sekund

// Graceful shutdown dla Passenger
const gracefulShutdown = (signal) => {
  console.log(`${signal} received: closing HTTP server`);
  
  // Zamknij wszystkie aktywne połączenia (Node.js 18.2+)
  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }
  
  // Zatrzymaj przyjmowanie nowych połączeń
  server.close((err) => {
    if (err) {
      console.error('Error during server close:', err);
      process.exit(1);
    }
    console.log('HTTP server closed successfully');
    process.exit(0);
  });
  
  // Force close po 5 sekundach (krótszy timeout dla shared hosting)
  // .unref() pozwala procesowi zakończyć się nawet jeśli timer jest aktywny
  const forceExitTimer = setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 5000);
  forceExitTimer.unref();
};

// Obsługa wszystkich sygnałów używanych przez Passenger
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
