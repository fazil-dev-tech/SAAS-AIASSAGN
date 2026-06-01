const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel, Header, Footer, PageNumber, ImageRun } = require('docx');
const { parse } = require('node-html-parser');
const fs = require('fs');

function htmlToDocxParagraphs(html) {
  const paragraphs = [];
  const root = parse(`<div>${html || ''}</div>`);

  function processNodes(nodes) {
    for (const node of nodes) {
      if (node.nodeType === 3) {
        const text = node.text.trim();
        if (text) paragraphs.push(new Paragraph({ children: [new TextRun({ text, size: 24, font: 'Times New Roman', color: '000000' })] }));
        continue;
      }

      const tag = node.tagName?.toLowerCase();
      const innerText = node.text?.trim() || '';

      if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
        const level = { h1: HeadingLevel.HEADING_1, h2: HeadingLevel.HEADING_2, h3: HeadingLevel.HEADING_3, h4: HeadingLevel.HEADING_4 }[tag];
        paragraphs.push(new Paragraph({ text: innerText, heading: level, spacing: { before: 200, after: 100 } }));
      } else if (tag === 'ul' || tag === 'ol') {
        const items = node.querySelectorAll('li');
        items.forEach(li => {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: '• ' + (li.text?.trim() || ''), size: 24, font: 'Times New Roman', color: '000000' })],
            spacing: { after: 60 },
            indent: { left: 720 },
            alignment: AlignmentType.JUSTIFIED
          }));
        });
      } else if (tag === 'strong' || tag === 'b') {
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: innerText, bold: true, size: 24, font: 'Times New Roman', color: '000000' })], spacing: { after: 80 }, alignment: AlignmentType.JUSTIFIED }));
      } else if (tag === 'em' || tag === 'i') {
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: innerText, italics: true, size: 24, font: 'Times New Roman', color: '000000' })], spacing: { after: 80 }, alignment: AlignmentType.JUSTIFIED }));
      } else if (tag === 'p') {
        const runs = [];
        for (const child of node.childNodes) {
          if (child.nodeType === 3) {
            runs.push(new TextRun({ text: child.text, size: 24, font: 'Times New Roman', color: '000000' }));
          } else {
            const childTag = child.tagName?.toLowerCase();
            const childText = child.text?.trim() || '';
            if (childTag === 'strong' || childTag === 'b') {
              runs.push(new TextRun({ text: childText, bold: true, size: 24, font: 'Times New Roman', color: '000000' }));
            } else if (childTag === 'em' || childTag === 'i') {
              runs.push(new TextRun({ text: childText, italics: true, size: 24, font: 'Times New Roman', color: '000000' }));
            } else {
              runs.push(new TextRun({ text: childText, size: 24, font: 'Times New Roman', color: '000000' }));
            }
          }
        }
        if (runs.length > 0) paragraphs.push(new Paragraph({ children: runs, spacing: { after: 120 }, alignment: AlignmentType.JUSTIFIED }));
      } else if (tag === 'br') {
        paragraphs.push(new Paragraph({ text: '' }));
      } else if (tag === 'img') {
        // ignore for test
      } else if (tag === 'div' || tag === 'section' || tag === 'article' || tag === 'span' || tag === 'center') {
        processNodes(node.childNodes);
      } else {
        if (innerText) paragraphs.push(new Paragraph({ children: [new TextRun({ text: innerText, size: 24, font: 'Times New Roman', color: '000000' })], spacing: { after: 80 }, alignment: AlignmentType.JUSTIFIED }));
      }
    }
  }
  processNodes(root.childNodes);
  return paragraphs;
}

async function generate() {
  const reportData = { subject: "Test Subject", dept: "ISE", inst: "SIT" };
  const answers = [{ unit: "Unit 1", num: 1, text: "Question 1", answerHTML: "<p>Hello world</p>" }];
  
  try {
    const doc = new Document({
      sections: [
        {
          properties: {
            page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
          },
          children: [
            ...(function() {
              let lastUnit = null;
              return (answers || []).flatMap((a, idx) => {
                const blocks = [];
                
                if (a.unit !== lastUnit) {
                  blocks.push(
                    new Paragraph({
                      text: (a.unit || '').toUpperCase(),
                      heading: HeadingLevel.HEADING_1,
                      pageBreakBefore: idx > 0,
                    })
                  );
                  lastUnit = a.unit;
                }

                blocks.push(
                  new Paragraph({
                    children: [
                      new TextRun({ text: a.text, size: 24, font: 'Times New Roman' })
                    ],
                    spacing: { before: 200, after: 200 },
                    alignment: AlignmentType.JUSTIFIED
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: "Solution:", bold: true, size: 24, underline: {}, font: 'Times New Roman' })],
                    spacing: { after: 120 },
                  }),
                  ...htmlToDocxParagraphs(a.answerHTML)
                );
                
                return blocks;
              });
            })(),
          ],
        }
      ]
    });
    
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync("test2.docx", buffer);
    console.log("Success! File size:", buffer.length);
  } catch (err) {
    console.error("Error:", err);
  }
}

generate();
