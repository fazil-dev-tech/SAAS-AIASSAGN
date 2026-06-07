const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let key = match[1].trim();
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

// Inject DNS Hook
const dns = require('dns');
const originalLookup = dns.lookup;
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
    resolver.resolve4(hostname, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        return originalLookup(hostname, actualOptions, actualCallback);
      }
      const ip = addresses[0];
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

async function runBenchmark() {
  console.log('=== NVIDIA CONTENT GENERATION LATENCY BENCHMARK ===');
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.error('NVIDIA_API_KEY not configured.');
    return;
  }

  const prompt = "Explain the central dogma of molecular biology in 3 paragraphs, formatted with HTML tags like <p>, <b>, and <i>.";
  
  console.log(`Sending prompt to NVIDIA API (Model: meta/llama-3.1-70b-instruct)...`);
  const start = Date.now();
  
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024
      })
    });
    
    const end = Date.now();
    const durationMs = end - start;
    
    if (!res.ok) {
      console.error(`❌ Request failed with status ${res.status}:`, await res.text());
      return;
    }
    
    const data = await res.json();
    const text = data.choices[0]?.message?.content || "";
    const words = text.split(/\s+/).length;
    const chars = text.length;
    
    console.log('\n--- BENCHMARK METRICS ---');
    console.log(`✅ Success Status: ${res.status} ${res.statusText}`);
    console.log(`⏱️ Total Latency: ${durationMs} ms (${(durationMs / 1000).toFixed(2)} seconds)`);
    console.log(`📝 Generated Words: ${words}`);
    console.log(`🔤 Generated Characters: ${chars}`);
    console.log(`⚡ Speed: ${(words / (durationMs / 1000)).toFixed(1)} words/sec | ${(chars / (durationMs / 1000)).toFixed(1)} chars/sec`);
    console.log('\n--- SAMPLE OUTPUT ---');
    console.log(text.substring(0, 300) + '...\n');
    
  } catch (err) {
    console.error('❌ Request error during benchmark:', err.message);
  }
}

runBenchmark();
