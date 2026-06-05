async function testNvidia() {
  console.log("=== Testing NVIDIA API (via Local Route) ===");
  try {
    const res = await fetch('http://localhost:3000/api/nvidia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: "What is the capital of France? Answer in one word." })
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log("✅ NVIDIA API Success! Response:", data.text);
    } else {
      const err = await res.text();
      console.error("❌ NVIDIA API Failed:", res.status, err);
    }
  } catch (error) {
    console.error("❌ NVIDIA Request Error:", error);
  }
}

async function testPollination() {
  console.log("\n=== Testing Pollinations.ai API ===");
  try {
    const prompt = "A futuristic city skyline";
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=600&nologo=true`;
    console.log("Fetching:", url);
    
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      console.log(`✅ Pollinations API Success! Received Image Blob: ${blob.type}, Size: ${blob.size} bytes`);
    } else {
      console.error("❌ Pollinations API Failed:", res.status);
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
