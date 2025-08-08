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

  const wrapText = (text: string, font: any, fontSize: number, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine === '' ? word : `${currentLine} ${word}`;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width < maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  for (const element of content) {
    if (element.text) {
      const fontSize = element.fontSize || 12;
      const lines = wrapText(element.text, font, fontSize, page.getSize().width - margin * 2);
      const lineHeight = font.heightAtSize(fontSize);
      const totalHeight = lines.length * lineHeight;

      if (y - totalHeight < margin) addNewPage();

      for (const line of lines) {
        const lineWidth = font.widthOfTextAtSize(line, fontSize);
        let x = margin;
        if (element.alignment === 'right') {
          x = page.getSize().width - margin - lineWidth;
        } else if (element.alignment === 'center') {
          x = (page.getSize().width / 2) - (lineWidth / 2);
        }

        page.drawText(line, {
          x,
          y,
          font,
          size: fontSize,
          color: element.color ? rgb(element.color[0], element.color[1], element.color[2]) : rgb(0, 0, 0),
        });
        y -= lineHeight;
      }
      y -= 5; // Extra space after text block
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
        let maxLines = 0;
        const wrappedCells = row.map((cell: any, i: number) => {
          const cellText = typeof cell === 'string' ? cell : cell.text;
          const lines = wrapText(cellText, font, fontSize, columnWidths[i] - cellMargin * 2);
          if (lines.length > maxLines) maxLines = lines.length;
          return lines;
        });

        const lineHeight = font.heightAtSize(fontSize);
        const rowHeight = maxLines * lineHeight + cellMargin * 2;

        if (y - rowHeight < margin) addNewPage();

        let x = margin;
        for (let i = 0; i < row.length; i++) {
          const cell = row[i];
          const cellContent = typeof cell === 'string' ? cell : cell.text;
          const cellAlignment = typeof cell === 'object' ? cell.alignment : 'left';
          const verticalAlignment = typeof cell === 'object' ? cell.verticalAlignment : 'top';

          const cellWidth = columnWidths[i];
          const lines = wrappedCells[i];
          const textHeight = lines.length * lineHeight;

          if (element.layout?.fillColor) {
            page.drawRectangle({
              x, y: y - rowHeight, width: cellWidth, height: rowHeight,
              color: rgb(element.layout.fillColor[0], element.layout.fillColor[1], element.layout.fillColor[2]),
            });
          }

          let lineY;
          if (verticalAlignment === 'middle') {
            lineY = y - (rowHeight / 2) + (textHeight / 2) - cellMargin;
          } else if (verticalAlignment === 'bottom') {
            lineY = y - rowHeight + textHeight;
          } else { // top
            lineY = y - cellMargin;
          }

          for (const line of lines) {
            const lineWidth = font.widthOfTextAtSize(line, fontSize);
            let lineX = x + cellMargin;
            if (cellAlignment === 'right') {
              lineX = x + cellWidth - cellMargin - lineWidth;
            } else if (cellAlignment === 'center') {
              lineX = x + (cellWidth / 2) - (lineWidth / 2);
            }
            page.drawText(line, { x: lineX, y: lineY, font, size: fontSize });
            lineY -= lineHeight;
          }

          if (element.layout?.borderColor) {
            page.drawRectangle({
              x, y: y - rowHeight, width: cellWidth, height: rowHeight,
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
