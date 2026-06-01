import { parse } from 'node-html-parser';

const html = "<h1>Test</h1><p>This is a <b>bold</b> test.</p>";
const root = parse(`<div>${html}</div>`);

console.log(root.childNodes.length);
for (const node of root.childNodes[0].childNodes) {
  console.log(node.tagName, node.text);
}
