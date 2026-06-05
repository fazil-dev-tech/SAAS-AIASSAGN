import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel, Header, Footer, PageNumber, ImageRun } from 'docx';
import { parse } from 'node-html-parser';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const docxSchema = z.object({
  reportData: z.object({
    subject: z.string().optional(),
    dept: z.string().optional(),
    inst: z.string().optional()
  }).catch({}),
  answers: z.array(z.any()).optional().default([])
});

/* ── Convert HTML string to an array of docx Paragraph objects ── */
function htmlToDocxParagraphs(html) {
  const paragraphs = [];
  // Wrap HTML in a div to ensure a consistent root structure
  const root = parse(`<div>${html || ''}</div>`);

  function processNodes(nodes) {
    for (const node of nodes) {
      if (node.nodeType === 3) {
        // Raw text node
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
        // Parse children for mixed bold/normal text within a paragraph
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
        const src = node.getAttribute('src');
        if (src && src.startsWith('data:image')) {
          const base64Data = src.replace(/^data:image\/\w+;base64,/, '');
          paragraphs.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: Buffer.from(base64Data, 'base64'),
                  transformation: {
                    width: 450,
                    height: 450
                  }
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 }
            })
          );
        }
      } else if (tag === 'div' || tag === 'section' || tag === 'article' || tag === 'span' || tag === 'center') {
        // Recurse into containers
        processNodes(node.childNodes);
      } else {
        // Fallback: treat as plain text if it has text inside
        if (innerText) paragraphs.push(new Paragraph({ children: [new TextRun({ text: innerText, size: 24, font: 'Times New Roman', color: '000000' })], spacing: { after: 80 }, alignment: AlignmentType.JUSTIFIED }));
      }
    }
  }

  processNodes(root.childNodes);
  return paragraphs;
}

export async function POST(request) {
  try {
    const rawBody = await request.json();
    const parsed = docxSchema.safeParse(rawBody);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload", details: parsed.error.issues }, { status: 400 });
    }

    const { reportData, answers } = parsed.data;

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: "Times New Roman" },
          },
        },
        paragraphStyles: [
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 32, bold: true, color: "000000", font: "Times New Roman" },
            paragraph: { spacing: { before: 240, after: 120 }, alignment: AlignmentType.CENTER },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 28, bold: true, color: "1F497D", font: "Times New Roman" }, // Dark blue
            paragraph: { spacing: { before: 240, after: 120 } },
          },
          {
            id: "Heading3",
            name: "Heading 3",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 24, bold: true, color: "1F497D", font: "Times New Roman" },
            paragraph: { spacing: { before: 240, after: 120 } },
          },
          {
            id: "Heading4",
            name: "Heading 4",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 24, bold: true, italics: true, color: "000000", font: "Times New Roman" },
            paragraph: { spacing: { before: 120, after: 120 } },
          }
        ]
      },
      sections: [
        {
          properties: {
            page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
          },
          headers: {
            default: new Header({
              children: [
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    bottom: { style: BorderStyle.SINGLE, size: 12, color: "8B0000" },
                    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
                  },
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph({ text: `Academic year - 2025-26` })],
                          borders: { top: {style: BorderStyle.NONE}, bottom: {style: BorderStyle.NONE}, left: {style: BorderStyle.NONE}, right: {style: BorderStyle.NONE} }
                        }),
                        new TableCell({
                          children: [new Paragraph({ text: reportData.subject || "Subject", alignment: AlignmentType.RIGHT })],
                          borders: { top: {style: BorderStyle.NONE}, bottom: {style: BorderStyle.NONE}, left: {style: BorderStyle.NONE}, right: {style: BorderStyle.NONE} }
                        })
                      ]
                    })
                  ]
                }),
                new Paragraph({ text: "", spacing: { after: 200 } }), // Padding below header
              ]
            })
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({ text: "", spacing: { before: 200 } }), // Padding above footer
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 12, color: "8B0000" },
                    left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
                  },
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph({ text: `Dept of ${reportData.dept || 'ISE'}, ${reportData.inst || 'SIT Tumakuru-03'}` })],
                          borders: { top: {style: BorderStyle.NONE}, bottom: {style: BorderStyle.NONE}, left: {style: BorderStyle.NONE}, right: {style: BorderStyle.NONE} }
                        }),
                        new TableCell({
                          children: [new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                              new TextRun({ text: "Page " }),
                              PageNumber.CURRENT,
                            ]
                          })],
                          borders: { top: {style: BorderStyle.NONE}, bottom: {style: BorderStyle.NONE}, left: {style: BorderStyle.NONE}, right: {style: BorderStyle.NONE} }
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          },
          children: [
            // ANSWERS — properly formatted from HTML
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
                      new TextRun({ text: `Q${a.num ? a.num + '. ' : ''}${a.text}`, size: 24, font: 'Times New Roman', bold: true })
                    ],
                    spacing: { before: 200, after: 200 },
                    alignment: AlignmentType.JUSTIFIED,
                    pageBreakBefore: idx > 0 && a.unit === lastUnit
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: "Solution:", bold: true, size: 24, font: 'Times New Roman' })],
                    spacing: { after: 120 },
                  }),
                  ...htmlToDocxParagraphs(a.answerHTML)
                );
                
                return blocks;
              });
            })(),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="Report_${reportData.subject || 'Assignment'}.docx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    });

  } catch (error) {
    console.error("DOCX Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
