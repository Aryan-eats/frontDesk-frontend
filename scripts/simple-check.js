#!/usr/bin/env node

const https = require('https');
const http = require('http');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://frontdesk-sigma.vercel.app';

console.log(`Frontend-Backend Health Check`);
console.log(`Target: ${API_BASE_URL}`);
console.log('=' .repeat(50));

const makeRequest = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;
    const startTime = Date.now();
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Frontend-Health-Check/2.0',
        ...options.headers
      },
      timeout: 10000 
    };

    if (options.data) {
      const postData = JSON.stringify(options.data);
      requestOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = lib.request(requestOptions, (res) => {
      const responseTime = Date.now() - startTime;
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          statusCode: res.statusCode,
          responseTime,
          success: res.statusCode >= 200 && res.statusCode < 400,
          data: data.substring(0, 500) 
        });
      });
    });
    
    req.on('error', (error) => {
      reject({
        url,
        error: error.message,
        success: false
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject({
        url,
        error: 'Request timeout (10s)',
        success: false
      });
    });

    if (options.data) {
      req.write(JSON.stringify(options.data));
    }
    
    req.end();
  });
};

const endpoints = [
  { path: '/health', name: 'Health Check', critical: true },
  { path: '/doctors', name: 'Doctors API', critical: true, authRequired: true },
  { path: '/queue', name: 'Queue API', critical: true, authRequired: true },
  { path: '/appointments', name: 'Appointments API', critical: true, authRequired: true }
];

async function checkEndpoints() {
  const results = [];
  let criticalFailed = false;
  
  for (const endpoint of endpoints) {
    const url = `${API_BASE_URL}${endpoint.path}`;
    
    try {
      console.log(`🔍 Testing ${endpoint.name}...`);
      const result = await makeRequest(url);
      
      if (result.success) {
        console.log(`✅ ${endpoint.name} - OK (${result.statusCode}) - ${result.responseTime}ms`);
      } else if (result.statusCode === 401 && endpoint.authRequired) {
        console.log(`✅ ${endpoint.name} - OK (${result.statusCode}) - ${result.responseTime}ms - Auth required (expected)`);
        result.success = true;
      } else {
        console.log(`⚠️  ${endpoint.name} - Warning (${result.statusCode}) - ${result.responseTime}ms`);
        if (endpoint.critical) criticalFailed = true;
      }
      
      results.push({ ...endpoint, ...result });
      
    } catch (error) {
      console.log(`❌ ${endpoint.name} - FAILED - ${error.error}`);
      results.push({ ...endpoint, ...error });
      if (endpoint.critical) criticalFailed = true;
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 SUMMARY');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  if (criticalFailed) {
    console.log('\n🚨 CRITICAL: Core backend services are down!');
    console.log('The frontend may not function properly.');
    console.log('\nTroubleshooting steps:');
    console.log('1. Check if backend server is running');
    console.log('2. Verify database connections');
    console.log('3. Check backend logs for errors');
    console.log('4. Ensure environment variables are set');
    process.exit(1);
  } else if (successful === total) {
    console.log('\n All systems operational!');
    console.log('Backend is healthy and ready for frontend connections.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Partial functionality available.');
    console.log('Some endpoints have issues but core functionality may work.');
    process.exit(0);
  }
}

checkEndpoints().catch(error => {
  console.error('\n💥 Health check failed:', error);
  process.exit(2);
});
