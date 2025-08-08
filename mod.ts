import { PDFDocument, rgb, StandardFonts, PageSizes } from 'https://cdn.skypack.dev/pdf-lib';

async function performLayout(docDefinition: any, font: any) {
  const { pageSize = 'A4', pageOrientation = 'portrait', content } = docDefinition;
  const margin = 50;

  const pageDims = PageSizes[pageSize];
  const [width, height] = pageOrientation === 'landscape' ? [pageDims[1], pageDims[0]] : pageDims;

  let y = height - margin;
  let currentPage = { elements: [] };
  const pages = [currentPage];

  const addNewPage = () => {
    currentPage = { elements: [] };
    pages.push(currentPage);
    y = height - margin;
  };

  const wrapText = (text: string, font: any, fontSize: number, maxWidth: number): string[] => {
    if (!text) return [];
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
      const lines = wrapText(element.text, font, fontSize, width - margin * 2);
      const lineHeight = font.heightAtSize(fontSize);
      const totalHeight = lines.length * lineHeight;

      if (y - totalHeight < margin) addNewPage();

      let lineY = y;
      for (const line of lines) {
        const lineWidth = font.widthOfTextAtSize(line, fontSize);
        let x = margin;
        if (element.alignment === 'right') x = width - margin - lineWidth;
        else if (element.alignment === 'center') x = (width / 2) - (lineWidth / 2);

        currentPage.elements.push({ type: 'text', text: line, x, y: lineY, fontSize, color: element.color });
        lineY -= lineHeight;
      }
      y = lineY - 5;
    } else if (element.image) {
      // Image layouting is tricky without knowing dimensions beforehand.
      // For now, we assume a fixed size or fetch it, which is slow.
      // Let's assume a fixed height for layout purposes.
      const imageHeight = 100; // Placeholder
      if (y - imageHeight < margin) addNewPage();
      currentPage.elements.push({ type: 'image', image: element.image, x: margin, y: y - imageHeight, width: 150, height: imageHeight });
      y -= imageHeight + 5;
    } else if (element.table) {
      const { table } = element;
      const { body, widths } = table;
      const cellMargin = 5;
      const fontSize = element.fontSize || 12;
      const availableWidth = width - margin * 2;
      const numColumns = body[0]?.length || 1;
      let columnWidths: number[];
      if (widths === '*') columnWidths = Array(numColumns).fill(availableWidth / numColumns);
      else if (Array.isArray(widths)) columnWidths = widths.map(w => w === '*' ? availableWidth / numColumns : w);
      else columnWidths = Array(numColumns).fill(100);

      for (const row of body) {
        let maxLines = 0;
        const wrappedCells = row.map((cell: any, i: number) => {
          const cellText = typeof cell === 'string' ? cell : cell.text;
          const lines = wrapText(cellText, font, fontSize, columnWidths[i] - cellMargin * 2);
          if (lines.length > maxLines) maxLines = lines.length;
          return { ...cell, lines };
        });

        const lineHeight = font.heightAtSize(fontSize);
        const rowHeight = maxLines * lineHeight + cellMargin * 2;
        if (y - rowHeight < margin) addNewPage();

        let currentX = margin;
        for (let i = 0; i < wrappedCells.length; i++) {
          const cell = wrappedCells[i];
          const cellWidth = columnWidths[i];
          const textHeight = cell.lines.length * lineHeight;

          const ascent = font.heightAtSize(fontSize) * 0.8; // Revert to approximation
          const freeSpace = rowHeight - textHeight - cellMargin * 2;
          let blockY = y - cellMargin - ascent;

          if (cell.verticalAlignment === 'middle') blockY -= freeSpace / 2;
          else if (cell.verticalAlignment === 'bottom') blockY -= freeSpace;

          const fillColor = typeof element.layout?.fillColor === 'function'
            ? element.layout.fillColor(body.indexOf(row))
            : element.layout?.fillColor;

          currentPage.elements.push({
            type: 'cell',
            x: currentX, y: y - rowHeight, width: cellWidth, height: rowHeight,
            fillColor: fillColor,
            borderColor: element.layout?.borderColor,
            borderWidth: element.layout?.borderWidth,
          });

          let lineY = blockY;
          for(const line of cell.lines) {
            const lineWidth = font.widthOfTextAtSize(line, fontSize);
            let lineX = currentX + cellMargin;
            if (cell.alignment === 'right') lineX = currentX + cellWidth - cellMargin - lineWidth;
            else if (cell.alignment === 'center') lineX = currentX + (cellWidth / 2) - (lineWidth / 2);
            currentPage.elements.push({ type: 'text', text: line, x: lineX, y: lineY, fontSize });
            lineY -= lineHeight;
          }
          currentX += cellWidth;
        }
        y -= rowHeight;
      }
      y -= 10;
    }
  }
  return pages;
}

export async function createPdf(docDefinition: any): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pagesLayout = await performLayout(docDefinition, font);

  const totalPages = pagesLayout.length;
  for (let i = 0; i < totalPages; i++) {
    const pageLayout = pagesLayout[i];
    const { pageSize = 'A4', pageOrientation = 'portrait' } = docDefinition;
    const page = pdfDoc.addPage(PageSizes[pageSize]);
    if (pageOrientation === 'landscape') {
      const { width, height } = page.getSize();
      page.setSize(height, width);
    }

    for (const element of pageLayout.elements) {
      if (element.type === 'text') {
        page.drawText(element.text, {
          x: element.x,
          y: element.y,
          font,
          size: element.fontSize,
          color: element.color ? rgb(element.color[0], element.color[1], element.color[2]) : rgb(0, 0, 0),
        });
      } else if (element.type === 'image') {
        const imageBytes = await fetch(element.image).then((res) => res.arrayBuffer());
        const image = await pdfDoc.embedPng(imageBytes);
        page.drawImage(image, { x: element.x, y: element.y, width: element.width, height: element.height });
      } else if (element.type === 'cell') {
        const rectOptions: any = {
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
        };
        if (element.fillColor) {
            rectOptions.color = rgb(element.fillColor[0], element.fillColor[1], element.fillColor[2]);
        }
        if (element.borderColor) {
            rectOptions.borderColor = rgb(element.borderColor[0], element.borderColor[1], element.borderColor[2]);
            rectOptions.borderWidth = element.borderWidth || 1;
        }
        page.drawRectangle(rectOptions);
      }
    }

    if (docDefinition.footer) {
      const pageNumber = i + 1;
      let footerText = docDefinition.footer.text || '';
      footerText = footerText.replace('{pageNumber}', pageNumber.toString()).replace('{totalPages}', totalPages.toString());

      const fontSize = docDefinition.footer.fontSize || 10;
      const textWidth = font.widthOfTextAtSize(footerText, fontSize);
      const { width } = page.getSize();
      const margin = 50;

      let x = margin;
      if (docDefinition.footer.alignment === 'right') x = width - margin - textWidth;
      else if (docDefinition.footer.alignment === 'center') x = width / 2 - textWidth / 2;

      page.drawText(footerText, {
        x,
        y: margin / 2,
        font,
        size: fontSize,
        color: docDefinition.footer.color ? rgb(docDefinition.footer.color[0], docDefinition.footer.color[1], docDefinition.footer.color[2]) : rgb(0, 0, 0),
      });
    }
  }

  return pdfDoc.saveAsBase64();
}
