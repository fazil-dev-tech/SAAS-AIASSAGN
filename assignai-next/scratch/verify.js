const { parse } = require('node-html-parser');
const root = parse('<p>This is <b>bold</b> text.</p>');
const p = root.childNodes[0];

function walk(node) {
  if (node.nodeType === 3) {
    console.log("TEXT NODE:", JSON.stringify(node.text));
  } else {
    console.log("ELEMENT:", node.tagName);
    for (const child of node.childNodes) {
      walk(child);
    }
  }
}
walk(p);
