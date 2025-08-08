import { PDFDocument, rgb, StandardFonts, PageSizes } from 'https://cdn.skypack.dev/pdf-lib';

export async function createPdf(docDefinition: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const { pageSize = 'A4', pageOrientation = 'portrait', content } = docDefinition;

  let page = pdfDoc.addPage(PageSizes[pageSize]);
  if (pageOrientation === 'landscape') {
    const { width, height } = page.getSize();
    page.setSize(height, width);
  }

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const addNewPage = () => {
    page = pdfDoc.addPage(PageSizes[pageSize]);
    if (pageOrientation === 'landscape') {
      const { width, height } = page.getSize();
      page.setSize(height, width);
    }
    y = page.getSize().height - margin;
  };

  for (const element of content) {
    const elementHeight = (element.fontSize || 12) + 5;
    if (y - elementHeight < margin) addNewPage();

    if (element.text) {
      page.drawText(element.text, {
        x: margin,
        y,
        font,
        size: element.fontSize || 12,
        color: element.color ? rgb(element.color[0], element.color[1], element.color[2]) : rgb(0, 0, 0),
      });
      y -= elementHeight;
    } else if (element.image) {
      const imageBytes = await fetch(element.image).then((res) => res.arrayBuffer());
      const image = await pdfDoc.embedPng(imageBytes);
      const dims = image.scale(0.5);

      if (y - dims.height < margin) addNewPage();

      page.drawImage(image, {
        x: margin,
        y: y - dims.height,
        width: dims.width,
        height: dims.height,
      });
      y -= dims.height + 5;
    } else if (element.table) {
      const { table } = element;
      const { body, widths } = table;
      const cellMargin = 5;
      const fontSize = element.fontSize || 12;
      const rowHeight = fontSize + cellMargin;
      const availableWidth = page.getSize().width - margin * 2;

      let columnWidths: number[];
      const numColumns = body[0]?.length || 1;

      if (widths === '*') {
        columnWidths = Array(numColumns).fill(availableWidth / numColumns);
      } else if (Array.isArray(widths)) {
        columnWidths = widths.map(w => w === '*' ? availableWidth / numColumns : w);
      } else {
        columnWidths = Array(numColumns).fill(100); // Default fixed width
      }

      for (const row of body) {
        if (y - rowHeight < margin) addNewPage();
        let x = margin;
        for (let i = 0; i < row.length; i++) {
          const cell = row[i];
          const cellWidth = columnWidths[i];

          // Draw cell background
          if (element.layout?.fillColor) {
            page.drawRectangle({
              x,
              y: y - rowHeight + cellMargin,
              width: cellWidth,
              height: rowHeight,
              color: rgb(element.layout.fillColor[0], element.layout.fillColor[1], element.layout.fillColor[2]),
            });
          }

          // Draw cell text
          page.drawText(cell, { x: x + cellMargin, y, font, size: fontSize });

          // Draw cell border
          if (element.layout?.borderColor) {
            page.drawRectangle({
              x,
              y: y - rowHeight + cellMargin,
              width: cellWidth,
              height: rowHeight,
              borderColor: rgb(element.layout.borderColor[0], element.layout.borderColor[1], element.layout.borderColor[2]),
              borderWidth: element.layout.borderWidth || 1,
            });
          }
          x += cellWidth;
        }
        y -= rowHeight;
      }
      y -= 10; // Extra space after table
    }
  }

  return await pdfDoc.save();
}
