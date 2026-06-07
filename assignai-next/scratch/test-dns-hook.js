const dns = require('dns');
const originalLookup = dns.lookup;

// Configure dns resolver to use Google DNS
const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '8.8.4.4']);

dns.lookup = function(hostname, options, callback) {
  let actualCallback = callback;
  let actualOptions = options;
  if (typeof options === 'function') {
    actualCallback = options;
    actualOptions = {};
  }

  if (hostname === 'integrate.api.nvidia.com') {
    console.log(`[DNS HOOK] Intercepted lookup for ${hostname}, options:`, actualOptions);
    resolver.resolve4(hostname, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        console.log(`[DNS HOOK] resolver.resolve4 failed, falling back to original lookup`, err);
        return originalLookup(hostname, actualOptions, actualCallback);
      }
      const ip = addresses[0];
      console.log(`[DNS HOOK] Resolved ${hostname} to ${ip} via Google DNS`);
      if (actualOptions.all) {
        return actualCallback(null, addresses.map(addr => ({ address: addr, family: 4 })));
      } else {
        return actualCallback(null, ip, 4);
      }
    });
    return;
  }
  return originalLookup(hostname, actualOptions, actualCallback);
};

// Now test fetch
async function testFetch() {
  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
      headers: {
        'Authorization': 'Bearer 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'
      }
    });
    console.log(`Fetch status: ${res.status}`);
    const text = await res.text();
    console.log(`Fetch response length: ${text.length}`);
    const data = JSON.parse(text);
    console.log(`Models count: ${data.data?.length || 0}`);
    console.log('All models found:');
    (data.data || []).forEach(m => console.log(`  - ${m.id}`));
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

testFetch();
