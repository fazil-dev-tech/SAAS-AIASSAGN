fetch('https://assignai-next.vercel.app/api/export/docx', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reportData: { subject: 'Test' }, answers: [{ answerHTML: '<h1>Test</h1>' }] })
}).then(async r => {
  console.log('STATUS:', r.status);
  console.log('BODY:', await r.text());
}).catch(console.error);
