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

export default {
  apps: [{
    name: 'mobilne-3d',
    script: './server.js',
    
    // Instance configuration
    instances: 2,  // Reduced for shared hosting
    exec_mode: 'cluster',  // Cluster mode for load balancing
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 8080,
      HOST: 's108.cyber-folks.pl',
      SERVER_IP: '195.78.66.103',
    },
    
    // Logging
    error_file: './logs/pm2-err.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Monitoring
    max_memory_restart: '300M',  // Restart if memory usage exceeds 300MB
    
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
  
  // Deployment configuration for Cyberfolks.pl
  deploy: {
    production: {
      user: 'itshjoxaxd',
      host: 's108.cyber-folks.pl',
      ref: 'origin/main',
      repo: 'git@github.com:username/repo.git',
      path: '/home/itshjoxaxd/mobilne-3d',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'echo "Setting up Cyberfolks production server..."',
    },
  },
};