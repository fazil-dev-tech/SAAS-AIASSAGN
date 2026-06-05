const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const apiKeyMatch = envFile.match(/NVIDIA_API_KEY=(.*)/);
if (apiKeyMatch) {
  process.env.NVIDIA_API_KEY = apiKeyMatch[1].trim();
}


async function testNvidia() {
  console.log("=== Debugging NVIDIA API Direct ===");
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.error("No NVIDIA_API_KEY found in environment!");
    return;
  }
  
  const payload = {
    model: "meta/llama3-70b-instruct",
    messages: [{ role: "user", content: "Hello, answer in one word." }],
    max_tokens: 10
  };

  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${text}`);
  } catch (error) {
    console.error("❌ NVIDIA Request Error:", error);
  }
}

async function testPollination() {
  console.log("\n=== Debugging Pollinations.ai (NEW API) Direct ===");
  try {
    const prompt = "A futuristic city skyline";
    const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=flux`;
    console.log("Fetching:", url);
    
    const res = await fetch(url);
    console.log(`Status: ${res.status}`);
    if (!res.ok) {
        const text = await res.text();
        console.log(`Error Body: ${text.substring(0, 500)}`);
    } else {
        const blob = await res.blob();
        console.log(`Success! Got image data. Type: ${blob.type}, Size: ${blob.size}`);
    }
  } catch (error) {
    console.error("❌ Pollinations Request Error:", error);
  }
}



async function runTests() {
  await testNvidia();
  await testPollination();
}

runTests();
