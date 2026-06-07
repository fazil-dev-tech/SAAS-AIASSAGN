const { exec } = require('child_process');

const apiKey = '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';
const cmd = `curl.exe -s -H "Authorization: Bearer ${apiKey}" https://integrate.api.nvidia.com/v1/models`;

exec(cmd, (err, stdout, stderr) => {
  if (err) {
    console.error('Error:', err.message);
    return;
  }
  try {
    const data = JSON.parse(stdout);
    const models = data.data || [];
    console.log(`Total models found: ${models.length}`);
    models.forEach(m => console.log(`  - ${m.id}`));
  } catch (e) {
    console.error('Parse error:', e.message);
  }
});
