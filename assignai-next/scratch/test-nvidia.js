async function testNvidia() {
  console.log('Testing NVIDIA route /api/nvidia directly...');
  try {
    const res = await fetch('http://localhost:3000/api/nvidia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Hello from test suite! Say "Ready"' })
    });
    
    console.log('NVIDIA Status:', res.status, res.statusText);
    const data = await res.json();
    console.log('Response:', data);
  } catch (err) {
    console.error('NVIDIA test route error:', err.message);
  }
}

testNvidia();
