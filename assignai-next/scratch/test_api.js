const { POST } = require('./src/app/api/export/docx/route.js');
const fs = require('fs');

async function run() {
  const req = {
    json: async () => ({
      reportData: { subject: "Test subject", dept: "ISE", inst: "SIT" },
      answers: [
        { unit: "Unit 1", num: 1, text: "Q1", answerHTML: "<p>Answer 1</p>" }
      ]
    })
  };
  
  const res = await POST(req);
  console.log("Status:", res.status);
  
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync('test_api.docx', buffer);
  console.log("Wrote test_api.docx size:", buffer.length);
}

run();
