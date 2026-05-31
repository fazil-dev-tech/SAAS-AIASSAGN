const fs = require('fs');
let c = fs.readFileSync('src/app/page.js', 'utf8');
c = c.replace(/, filter: "blur\(10px\)" /g, ' ');
c = c.replace(/, filter: "blur\(0px\)" /g, ' ');
fs.writeFileSync('src/app/page.js', c);
console.log('done');
