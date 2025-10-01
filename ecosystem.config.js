/**
 * PM2 ecosystem configuration file
 * 
 * This file configures PM2 process manager for production deployment.
 * 
 * Usage:
 * pm2 start ecosystem.config.js
 * pm2 save
 * pm2 startup
 * 
 * For more information: https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
  apps: [{
    name: '3d-print-app',
    script: './server.js',
    
    // Instance configuration
    instances: 'max',  // Use all available CPU cores
    exec_mode: 'cluster',  // Cluster mode for load balancing
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 8080,
      HOST: '0.0.0.0',
    },
    
    // Logging
    error_file: './logs/pm2-err.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Monitoring
    max_memory_restart: '500M',  // Restart if memory usage exceeds 500MB
    
    // Restart behavior
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Advanced features
    listen_timeout: 3000,
    kill_timeout: 5000,
    wait_ready: false,
    
    // Watch (disabled in production)
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'dist'],
  }],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:username/repo.git',
      path: '/var/www/3d-print-app',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'echo "Setting up production server..."',
    },
  },
};