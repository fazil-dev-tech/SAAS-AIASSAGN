import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel, Header, Footer, PageNumber, ImageRun } from 'docx';
import { parse } from 'node-html-parser';
import { z } from 'zod';
import rateLimit from '@/utils/rateLimit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});
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
async function htmlToDocxParagraphs(html) {
  const paragraphs = [];
  const cleanHtml = (html || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  const root = parse(`<div>${cleanHtml}</div>`);

  function parseTextRuns(node, currentFormat = {}) {
    let runs = [];
    if (!node) return runs;
    if (node.nodeType === 3) {
      let text = node.text;
      if (text) {
        text = text.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ');
        if (text) runs.push(new TextRun({ text, size: 24, font: 'Times New Roman', color: '000000', ...currentFormat }));
      }
      return runs;
    }
    const tag = node.tagName?.toLowerCase();
    if (tag === 'style' || tag === 'script') return runs;
    const format = { ...currentFormat };
    if (tag === 'strong' || tag === 'b') format.bold = true;
    if (tag === 'em' || tag === 'i') format.italics = true;
    if (tag === 'u') format.underline = {};

    if (tag === 'br') {
      runs.push(new TextRun({ break: 1 }));
    }
    if (node.childNodes) {
      for (const child of node.childNodes) {
        runs.push(...parseTextRuns(child, format));
      }
    }
    return runs;
  }

  async function processNodes(nodes) {
    for (const node of nodes) {
      if (node.nodeType === 3) {
        let text = node.text;
        text = text.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
        if (text) paragraphs.push(new Paragraph({ children: [new TextRun({ text, size: 24, font: 'Times New Roman', color: '000000' })], widowControl: true }));
        continue;
      }

      const tag = node.tagName?.toLowerCase();
      if (tag === 'style' || tag === 'script') continue;

      if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
        const level = { h1: HeadingLevel.HEADING_1, h2: HeadingLevel.HEADING_2, h3: HeadingLevel.HEADING_3, h4: HeadingLevel.HEADING_4 }[tag];
        paragraphs.push(new Paragraph({ 
          children: parseTextRuns(node), 
          heading: level, 
          spacing: { before: 200, after: 100 },
          keepNext: true,
          keepLines: true,
          widowControl: true
        }));
      } else if (tag === 'ul' || tag === 'ol') {
        const items = node.querySelectorAll('li');
        items.forEach(li => {
          const runs = parseTextRuns(li);
          if (runs.length > 0) {
            runs[0] = new TextRun({ text: '• ' + runs[0].text, size: 24, font: 'Times New Roman', color: '000000', bold: runs[0].bold, italics: runs[0].italics, underline: runs[0].underline });
          } else {
            runs.push(new TextRun({ text: '• ', size: 24, font: 'Times New Roman', color: '000000' }));
          }
          paragraphs.push(new Paragraph({
            children: runs,
            spacing: { after: 60 },
            indent: { left: 720 },
            alignment: AlignmentType.JUSTIFIED,
            widowControl: true
          }));
        });
      } else if (tag === 'p') {
        const runs = parseTextRuns(node);
        if (runs.length > 0) paragraphs.push(new Paragraph({ children: runs, spacing: { after: 120 }, alignment: AlignmentType.JUSTIFIED, widowControl: true }));
      } else if (tag === 'img') {
        const src = node.getAttribute('src');
        if (src) {
          let imageBuffer = null;
          if (src.startsWith('data:image')) {
            const base64Data = src.replace(/^data:image\/\w+;base64,/, '');
            imageBuffer = Buffer.from(base64Data, 'base64');
          } else if (src.startsWith('http')) {
            try {
              const res = await fetch(src);
              if (res.ok) {
                const arrayBuffer = await res.arrayBuffer();
                imageBuffer = Buffer.from(arrayBuffer);
              }
            } catch (err) {
              console.error("Error fetching image from URL in DOCX exporter:", err);
            }
          }
          if (imageBuffer) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: imageBuffer,
                    transformation: { width: 450, height: 450 }
                  })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 200 }
              })
            );
          }
        }
      } else if (tag === 'div' || tag === 'section' || tag === 'article' || tag === 'span' || tag === 'center') {
        await processNodes(node.childNodes);
      } else if (tag === 'strong' || tag === 'b' || tag === 'em' || tag === 'i') {
        const runs = parseTextRuns(node);
        if (runs.length > 0) paragraphs.push(new Paragraph({ children: runs, spacing: { after: 80 }, alignment: AlignmentType.JUSTIFIED, widowControl: true }));
      } else {
        const text = node.text?.trim() || '';
        if (text) paragraphs.push(new Paragraph({ children: [new TextRun({ text, size: 24, font: 'Times New Roman', color: '000000' })], spacing: { after: 80 }, alignment: AlignmentType.JUSTIFIED, widowControl: true }));
      }
    }
  }

  await processNodes(root.childNodes);
  return paragraphs;
}

export async function POST(request) {
  try {
    try {
      const ip = request.headers.get('x-forwarded-for') || 'anonymous';
      await limiter.check(NextResponse, 100, ip); // HIGH limit: 100 exports per minute
    } catch {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

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
            paragraph: { spacing: { before: 240, after: 120 }, alignment: AlignmentType.CENTER, keepNext: true, keepLines: true },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 28, bold: true, color: "1F497D", font: "Times New Roman" }, // Dark blue
            paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, keepLines: true },
          },
          {
            id: "Heading3",
            name: "Heading 3",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 24, bold: true, color: "1F497D", font: "Times New Roman" },
            paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, keepLines: true },
          },
          {
            id: "Heading4",
            name: "Heading 4",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 24, bold: true, italics: true, color: "000000", font: "Times New Roman" },
            paragraph: { spacing: { before: 120, after: 120 }, keepNext: true, keepLines: true },
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
                              new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES] })
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
          children: await (async function() {
            const blocks = [];
            for (let idx = 0; idx < (answers || []).length; idx++) {
              const a = answers[idx];
              if (idx > 0) {
                blocks.push(new Paragraph({ pageBreakBefore: true, text: "" }));
              }
              const paras = await htmlToDocxParagraphs(a.answerHTML);
              blocks.push(...paras);
            }
            return blocks;
          })(),
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
