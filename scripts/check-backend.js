#!/usr/bin/env node

const https = require('https');
const http = require('http');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://frontdesk-sigma.vercel.app';

console.log(` Checking backend connection to: ${API_BASE_URL}`);

const checkEndpoint = (url, headers = {}) => {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const startTime = Date.now();
    
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Frontend-Health-Check/1.0',
        ...headers
      }
    };
    
    const req = lib.request(url, options, (res) => {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          statusCode,
          responseTime,
          success: statusCode >= 200 && statusCode < 400,
          data: data.length < 1000 ? data : data.substring(0, 1000) + '...'
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
    
    req.setTimeout(15000, () => {
      req.destroy();
      reject({
        url,
        error: 'Request timeout',
        success: false
      });
    });
    
    req.end();
  });
};

const login = (credentials) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(credentials);
    const url = `${API_BASE_URL}/auth/login`;
    const lib = url.startsWith('https:') ? https : http;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const response = JSON.parse(data);
            resolve(response.accessToken);
          } else {
            reject(`Login failed: ${res.statusCode} - ${data}`);
          }
        } catch (e) {
          reject(`Invalid response: ${data}`);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error.message);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject('Login timeout');
    });
    
    req.write(postData);
    req.end();
  });
};

async function testAuthentication() {
  console.log('🔐 Testing authentication...');
  
  const testCredentials = {
    username: 'admin',
    password: 'admin123'
  };
  
  try {
    const token = await login(testCredentials);
    console.log('✅ Authentication successful');
    return token;
  } catch (error) {
    console.log(`❌ Authentication failed: ${error}`);
    return null;
  }
}

async function checkBackend() {
  const endpoints = [
    `${API_BASE_URL}/health`,
  ];
  
  console.log('\n📡 Testing basic connectivity...\n');
  
  for (const endpoint of endpoints) {
    try {
      const result = await checkEndpoint(endpoint);
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${endpoint}`);
      console.log(`   Status: ${result.statusCode}`);
      console.log(`   Response Time: ${result.responseTime}ms`);
      if (!result.success && result.data) {
        console.log(`   Response: ${result.data}`);
      }
      console.log('');
    } catch (error) {
      console.log(`❌ ${endpoint}`);
      console.log(`   Error: ${error.error || error.message || 'Unknown error'}`);
      console.log('');
    }
  }
  
  const token = await testAuthentication();
  
  if (token) {
    console.log('\n📡 Testing protected endpoints...\n');
    
    const protectedEndpoints = [
      `${API_BASE_URL}/doctors`,
      `${API_BASE_URL}/queue`,
      `${API_BASE_URL}/appointments`
    ];
    
    const authHeaders = {
      'Authorization': `Bearer ${token}`
    };
    
    for (const endpoint of protectedEndpoints) {
      try {
        const result = await checkEndpoint(endpoint, authHeaders);
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${endpoint}`);
        console.log(`   Status: ${result.statusCode}`);
        console.log(`   Response Time: ${result.responseTime}ms`);
        if (!result.success && result.data) {
          console.log(`   Response: ${result.data}`);
        }
        console.log('');
      } catch (error) {
        console.log(`❌ ${endpoint}`);
        console.log(`   Error: ${error.error || error.message || 'Unknown error'}`);
        console.log('');
      }
    }
  }
}

async function checkDNS() {
  const dns = require('dns').promises;
  const url = new URL(API_BASE_URL);
  
  try {
    console.log(`🌐 DNS Resolution for ${url.hostname}...`);
    const addresses = await dns.resolve4(url.hostname);
    console.log(`✅ DNS resolved to: ${addresses.join(', ')}`);
  } catch (error) {
    console.log(`❌ DNS resolution failed: ${error.message}`);
  }
}

async function main() {
  console.log('Backend Health Check Starting...\n');
  
  await checkDNS();
  console.log('');
  await checkBackend();
  
  console.log('Health check completed!\n');
  console.log('If endpoints are failing:');
  console.log('   1. Check if backend is deployed and running');
  console.log('   2. Verify CORS configuration allows your frontend domain');
  console.log('   3. Check backend logs for errors');
  console.log('   4. Verify database connectivity');
  console.log('   5. Check environment variables');
  console.log('   6. Verify authentication credentials');
}

main().catch(console.error);

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
        'User-Agent': 'Frontend-Health-Check/1.0',
        ...options.headers
      }
    };

    if (options.data) {
      const postData = JSON.stringify(options.data);
      requestOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = lib.request(requestOptions, (res) => {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : {};
          resolve({
            url,
            statusCode,
            responseTime,
            success: statusCode >= 200 && statusCode < 400,
            data: parsedData,
            rawData: data.length < 1000 ? data : data.substring(0, 1000) + '...'
          });
        } catch (parseError) {
          resolve({
            url,
            statusCode,
            responseTime,
            success: statusCode >= 200 && statusCode < 400,
            data: null,
            rawData: data.length < 1000 ? data : data.substring(0, 1000) + '...',
            parseError: parseError.message
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject({
        url,
        error: error.message,
        success: false
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject({
        url,
        error: 'Request timeout',
        success: false
      });
    });

    if (options.data) {
      req.write(JSON.stringify(options.data));
    }
    
    req.end();
  });
};

async function checkBackend() {
  const endpoints = [
    `${API_BASE_URL}/health`,
    `${API_BASE_URL}/doctors`,
    `${API_BASE_URL}/queue`,
    `${API_BASE_URL}/appointments`
  ];
  
  console.log('\n📡 Testing endpoints...\n');
  
  for (const endpoint of endpoints) {
    try {
      const result = await checkEndpoint(endpoint);
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${endpoint}`);
      console.log(`   Status: ${result.statusCode}`);
      console.log(`   Response Time: ${result.responseTime}ms`);
      if (!result.success) {
        console.log(`   Data: ${result.data}`);
      }
      console.log('');
    } catch (error) {
      console.log(`❌ ${endpoint}`);
      console.log(`   Error: ${error.error}`);
      console.log('');
    }
  }
}

async function checkDNS() {
  const dns = require('dns').promises;
  const url = new URL(API_BASE_URL);
  
  try {
    console.log(`🌐 DNS Resolution for ${url.hostname}...`);
    const addresses = await dns.resolve4(url.hostname);
    console.log(`✅ DNS resolved to: ${addresses.join(', ')}`);
  } catch (error) {
    console.log(`❌ DNS resolution failed: ${error.message}`);
  }
}

async function main() {
  console.log('Backend Health Check Starting...\n');
  
  await checkDNS();
  console.log('');
  await checkBackend();
  
  console.log('Health check completed!\n');
  console.log('If endpoints are failing:');
  console.log('   1. Check if backend is deployed and running');
  console.log('   2. Verify CORS configuration allows your frontend domain');
  console.log('   3. Check backend logs for errors');
  console.log('   4. Verify database connectivity');
  console.log('   5. Check environment variables');
}

main().catch(console.error);
