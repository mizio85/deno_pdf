import { PDFDocument, rgb, StandardFonts, PageSizes } from 'https://cdn.skypack.dev/pdf-lib';
export * from './types.ts';
import { PDFDocumentDefinition, ContentElement } from './types.ts';

const parseMargins = (margin: any) => {
  if (typeof margin === 'number') return { top: margin, bottom: margin, left: margin, right: margin };
  if (Array.isArray(margin) && margin.length === 4) return { left: margin[0], top: margin[1], right: margin[2], bottom: margin[3] };
  return { top: 50, bottom: 50, left: 50, right: 50 }; // Default
};

async function performLayout(docDefinition: PDFDocumentDefinition, pdfDoc: PDFDocument, fonts: any) {
  const { pageSize = 'A4', pageOrientation = 'portrait', content } = docDefinition;
  const margins = parseMargins(docDefinition.margin);

  const pageDims = PageSizes[pageSize];
  const [width, height] = pageOrientation === 'landscape' ? [pageDims[1], pageDims[0]] : pageDims;

  let y = height - margins.top;
  let currentPage = { elements: [] };
  const pages = [currentPage];

  const addNewPage = () => {
    currentPage = { elements: [] };
    pages.push(currentPage);
    y = height - margins.top;
  };

  const resolveStyles = (element: any, styles: any) => {
    if (!element.style || !styles) return element;
    const styleNames = Array.isArray(element.style) ? element.style : [element.style];

    let finalStyle = { ...element };

    for (const styleName of styleNames.reverse()) { // Apply styles from right to left
      const style = styles[styleName];
      if (style) {
        const mergedTable = { ...(style.table || {}), ...(finalStyle.table || {}) };
        const mergedLayout = { ...(style.layout || {}), ...(finalStyle.layout || {}) };

        finalStyle = { ...style, ...finalStyle };

        if (Object.keys(mergedTable).length > 0) finalStyle.table = mergedTable;
        if (Object.keys(mergedLayout).length > 0) finalStyle.layout = mergedLayout;
      }
    }
    return finalStyle;
  };

  const getFontName = (element: any): StandardFont => {
    if (typeof element !== 'object' || !element) return 'Helvetica';
    if (element.font) return element.font;
    if (element.bold && element.italics) return 'Helvetica-BoldOblique';
    if (element.bold) return 'Helvetica-Bold';
    if (element.italics) return 'Helvetica-Oblique';
    return 'Helvetica';
  };

  const getFont = async (element: any, fonts: any, pdfDoc: PDFDocument) => {
    const fontName = getFontName(element);
    if (!fonts[fontName]) {
      const fontKey = fontName.replace(/-/g, '') as keyof typeof StandardFonts;
      fonts[fontName] = await pdfDoc.embedFont(StandardFonts[fontKey]);
    }
    return fonts[fontName];
  };

  const wrapText = (text: any, font: any, fontSize: number, maxWidth: number): string[] => {
    const textAsString = String(text ?? '');
    if (!textAsString) return [];
    const words = textAsString.split(' ');
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

  for (const [i, initialElement] of (content as ContentElement[]).entries()) {
    const element = resolveStyles(initialElement, docDefinition.styles);

    if (element.pageBreak === 'before' && i > 0) {
        addNewPage();
    }

    if (element.margin) {
        const elementMargins = parseMargins(element.margin);
        y -= elementMargins.top;
    }

    if ('text' in element) {
      const font = await getFont(element, fonts, pdfDoc);
      const fontSize = element.fontSize || 12;
      const lines = wrapText(element.text, font, fontSize, width - margins.left - margins.right);
      const lineHeight = font.heightAtSize(fontSize);
      const totalHeight = lines.length * lineHeight;

      if (y - totalHeight < margins.bottom) addNewPage();

      const ascent = lineHeight * 0.8; // Approximation
      let lineY = y - ascent;
      for (const line of lines) {
        const lineWidth = font.widthOfTextAtSize(line, fontSize);
        let x = margins.left;
        if (element.alignment === 'right') x = width - margins.right - lineWidth;
        else if (element.alignment === 'center') x = (width / 2) - (lineWidth / 2);

        currentPage.elements.push({ type: 'text', text: line, x, y: lineY, fontSize, color: element.color, font: getFontName(element) });
        lineY -= lineHeight;
      }
      y = lineY - 5;
      if (element.margin) y -= parseMargins(element.margin).bottom;
    } else if ('image' in element) {
      // Image layouting is tricky without knowing dimensions beforehand.
      // For now, we assume a fixed size or fetch it, which is slow.
      // Let's assume a fixed height for layout purposes.
      const imageHeight = element.height || 100; // Placeholder
      const imageWidth = element.width || 150;
      if (y - imageHeight < margins.bottom) addNewPage();
      currentPage.elements.push({ type: 'image', image: element.image, x: margins.left, y: y - imageHeight, width: imageWidth, height: imageHeight });
      y -= imageHeight + 5;
      if (element.margin) y -= parseMargins(element.margin).bottom;
    } else if ('table' in element) {
      const { table } = element;
      const { body, widths } = table;
      const cellMargin = 5;
      const fontSize = element.fontSize || 12;
      const availableWidth = width - margins.left - margins.right;
      const numColumns = body[0]?.length || 1;
      let columnWidths: number[];
      if (widths === '*') columnWidths = Array(numColumns).fill(availableWidth / numColumns);
      else if (Array.isArray(widths)) columnWidths = widths.map(w => w === '*' ? availableWidth / numColumns : w);
      else columnWidths = Array(numColumns).fill(100);

      for (const row of body) {
        let maxLines = 0;
        const wrappedCells = [];
        for (const [i, cell] of row.entries()) {
            const isObjectCell = typeof cell === 'object' && cell !== null;
            const cellText = isObjectCell ? cell.text : cell;
            const cellElement = isObjectCell ? cell : {}; // Use empty object for non-object cells to avoid errors

            const cellFont = await getFont(cellElement, fonts, pdfDoc);
            const lines = wrapText(cellText, cellFont, fontSize, columnWidths[i] - cellMargin * 2);
            if (lines.length > maxLines) maxLines = lines.length;

            wrappedCells.push({
                ...(isObjectCell ? cell : { text: cellText }),
                lines,
                font: cellFont,
                fontName: getFontName(cellElement)
            });
        }

        const lineHeight = fonts.Helvetica.heightAtSize(fontSize); // Base line height on standard font
        const rowHeight = maxLines * lineHeight + cellMargin * 2;
        if (y - rowHeight < margins.bottom) addNewPage();

        let currentX = margins.left;
        for (let i = 0; i < wrappedCells.length; i++) {
          const cell = wrappedCells[i];
          const cellWidth = columnWidths[i];
          const textHeight = cell.lines.length * lineHeight;

          const ascent = cell.font.heightAtSize(fontSize) * 0.8;
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
            const lineWidth = cell.font.widthOfTextAtSize(line, fontSize);
            let lineX = currentX + cellMargin;
            if (cell.alignment === 'right') lineX = currentX + cellWidth - cellMargin - lineWidth;
            else if (cell.alignment === 'center') lineX = currentX + (cellWidth / 2) - (lineWidth / 2);
            currentPage.elements.push({ type: 'text', text: line, x: lineX, y: lineY, fontSize, font: cell.fontName });
            lineY -= lineHeight;
          }
          currentX += cellWidth;
        }
        y -= rowHeight;
      }
      y -= 10;
      if (element.margin) y -= parseMargins(element.margin).bottom;
    } else if ('ul' in element) {
        const font = await getFont(element, fonts, pdfDoc); // Lists can have styles
        const fontSize = element.fontSize || 12;
        const lineHeight = font.heightAtSize(fontSize);
        const indent = 20;

        for (const item of element.ul) {
            const bullet = '•';
            const bulletWidth = font.widthOfTextAtSize(bullet, fontSize);
            const itemText = wrapText(item, font, fontSize, width - margins.left - margins.right - indent);

            if (y - (itemText.length * lineHeight) < margins.bottom) addNewPage();

            const ascent = lineHeight * 0.8;
            let lineY = y - ascent;

            // Draw bullet
            currentPage.elements.push({ type: 'text', text: bullet, x: margins.left, y: lineY, fontSize, font: getFontName(element) });

            // Draw item text
            for (const line of itemText) {
                currentPage.elements.push({ type: 'text', text: line, x: margins.left + indent, y: lineY, fontSize, font: getFontName(element) });
                lineY -= lineHeight;
            }
            y = lineY;
        }
    } else if ('ol' in element) {
        const font = await getFont(element, fonts, pdfDoc);
        const fontSize = element.fontSize || 12;
        const lineHeight = font.heightAtSize(fontSize);
        const indent = 20;
        let counter = 1;

        for (const item of element.ol) {
            const number = `${counter++}.`;
            const numberWidth = font.widthOfTextAtSize(number, fontSize);
            const itemText = wrapText(item, font, fontSize, width - margins.left - margins.right - indent - numberWidth);

            if (y - (itemText.length * lineHeight) < margins.bottom) addNewPage();

            const ascent = lineHeight * 0.8;
            let lineY = y - ascent;

            // Draw number
            currentPage.elements.push({ type: 'text', text: number, x: margins.left, y: lineY, fontSize, font: getFontName(element) });

            // Draw item text
            for (const line of itemText) {
                currentPage.elements.push({ type: 'text', text: line, x: margins.left + indent, y: lineY, fontSize, font: getFontName(element) });
                lineY -= lineHeight;
            }
            y = lineY;
        }
    }
  }
  return pages;
}

export async function createPdf(docDefinition: PDFDocumentDefinition, options: { output?: 'uint8array' | 'base64' } = {}): Promise<Uint8Array | string> {
  const pdfDoc = await PDFDocument.create();
  const fonts = {}; // Initialize empty font cache

  const pagesLayout = await performLayout(docDefinition, pdfDoc, fonts);
  const margins = parseMargins(docDefinition.margin);

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
        const fontToUse = fonts[element.font || 'Helvetica'];
        page.drawText(element.text, {
          x: element.x,
          y: element.y,
          font: fontToUse,
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

      const footerFont = fonts.Helvetica; // Default font for footer
      const fontSize = docDefinition.footer.fontSize || 10;
      const textWidth = footerFont.widthOfTextAtSize(footerText, fontSize);
      const { width } = page.getSize();

      let x = margins.left;
      if (docDefinition.footer.alignment === 'right') x = width - margins.right - textWidth;
      else if (docDefinition.footer.alignment === 'center') x = width / 2 - textWidth / 2;

      page.drawText(footerText, {
        x,
        y: margins.bottom / 2,
        font: footerFont,
        size: fontSize,
        color: docDefinition.footer.color ? rgb(docDefinition.footer.color[0], docDefinition.footer.color[1], docDefinition.footer.color[2]) : rgb(0, 0, 0),
      });
    }
  }

  if (options.output === 'base64') {
    return pdfDoc.saveAsBase64();
  }
  return pdfDoc.save();
}
