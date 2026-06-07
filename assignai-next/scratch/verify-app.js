async function verifyApp() {
  console.log('--- STARTING APP HEALTH AND ROUTE VERIFICATION ---');
  
  const testRoutes = [
    { name: 'Homepage', url: 'http://localhost:3000/', method: 'GET' },
    { name: 'Admin Portal', url: 'http://localhost:3000/admin', method: 'GET' },
    { 
      name: 'Send OTP API (Invalid Payload test)', 
      url: 'http://localhost:3000/api/auth/send-otp', 
      method: 'POST',
      body: JSON.stringify({}) 
    },
    { 
      name: 'Verify OTP API (Invalid Payload test)', 
      url: 'http://localhost:3000/api/auth/verify-otp', 
      method: 'POST',
      body: JSON.stringify({}) 
    },
    { 
      name: 'Reports API (Invalid Payload test)', 
      url: 'http://localhost:3000/api/reports', 
      method: 'POST',
      body: JSON.stringify({}) 
    }
  ];

  for (const route of testRoutes) {
    try {
      const options = {
        method: route.method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (route.body) {
        options.body = route.body;
      }
      
      const res = await fetch(route.url, options);
      console.log(`[${route.name}]`);
      console.log(`  URL: ${route.url}`);
      console.log(`  Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        console.log(`  Response JSON:`, JSON.stringify(json, null, 2).split('\n').slice(0, 5).join('\n') + '\n  ...');
      } catch {
        console.log(`  Response Text (truncated):`, text.slice(0, 100) + '...');
      }
      console.log('--------------------------------------------------');
    } catch (err) {
      console.error(`❌ Error verifying route ${route.name}:`, err.message);
    }
  }
}

verifyApp();
