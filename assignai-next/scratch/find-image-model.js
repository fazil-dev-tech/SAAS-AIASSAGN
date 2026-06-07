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
    const imageModels = models.filter(m => 
      m.id.includes('sdxl') || 
      m.id.includes('stability') || 
      m.id.includes('flux') || 
      m.id.includes('diffusion') || 
      m.id.includes('image')
    );
    console.log('Found image/diffusion models:');
    imageModels.forEach(m => console.log(`  - ${m.id}`));
  } catch (e) {
    console.error('Parse error:', e.message);
    console.log('Stdout:', stdout.slice(0, 500));
  }
});
