import { PDFDocument, rgb, StandardFonts } from 'https://cdn.skypack.dev/pdf-lib';

export async function createPdf(docDefinition: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();

  const { content } = docDefinition;
  const { width, height } = page.getSize();
  let y = height - 40;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const element of content) {
    if (element.text) {
      page.drawText(element.text, {
        x: 50,
        y,
        font,
        size: element.fontSize || 12,
        color: element.color ? rgb(element.color[0], element.color[1], element.color[2]) : rgb(0, 0, 0),
      });
      y -= (element.fontSize || 12) + 5;
    } else if (element.image) {
      const imageBytes = await fetch(element.image).then((res) => res.arrayBuffer());
      const image = await pdfDoc.embedPng(imageBytes);
      const dims = image.scale(0.5);
      page.drawImage(image, {
        x: 50,
        y: y - dims.height,
        width: dims.width,
        height: dims.height,
      });
      y -= dims.height + 5;
    } else if (element.table) {
      const { table } = element;
      const { body } = table;
      const tableTop = y;
      const cellMargin = 5;
      const fontSize = element.fontSize || 12;

      let x = 50;
      for (const row of body) {
        for (const cell of row) {
          page.drawText(cell, { x, y, font, size: fontSize });
          x += 100; // Fixed column width
        }
        x = 50;
        y -= fontSize + cellMargin;
      }
      y -= 10; // Extra space after table
    }
  }

  return await pdfDoc.save();
}
