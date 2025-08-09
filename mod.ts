import { PDFDocument, rgb, StandardFonts, PageSizes } from 'https://cdn.skypack.dev/pdf-lib';
export * from './types.ts';
import { PDFDocumentDefinition, ContentElement, TextElement } from './types.ts';

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
    for (const styleName of styleNames.reverse()) {
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
    const lines: string[] = [];
    const paragraphs = textAsString.split('\n');
    for (const paragraph of paragraphs) {
        if (paragraph === '') {
            lines.push('');
            continue;
        }
        const words = paragraph.split(' ');
        let currentLine = '';
        for (const word of words) {
            if (!word) continue;
            const testLine = currentLine === '' ? word : `${currentLine} ${word}`;
            const testWidth = font.widthOfTextAtSize(testLine, fontSize);
            if (testWidth <= maxWidth) {
                currentLine = testLine;
            } else {
                if (currentLine !== '') {
                    lines.push(currentLine);
                }
                const wordWidth = font.widthOfTextAtSize(word, fontSize);
                if (wordWidth > maxWidth) {
                    lines.push(word);
                    currentLine = '';
                } else {
                    currentLine = word;
                }
            }
        }
        if (currentLine !== '') {
            lines.push(currentLine);
        }
    }
    return lines;
  };

  const layoutElement = async (element: ContentElement, parentStyle: any = {}) => {
    element = { ...parentStyle, ...element };
    element = resolveStyles(element, docDefinition.styles);

    if (element.pageBreak === 'before') {
        addNewPage();
    }
    if (element.margin) {
        y -= parseMargins(element.margin).top;
    }

    if ('stack' in element) {
      const { stack, ...pStyle } = element;
      for (const child of stack) {
        await layoutElement(child, pStyle);
      }
    } else if ('text' in element) {
      const font = await getFont(element, fonts, pdfDoc);
      const fontSize = element.fontSize || 12;
      const lines = wrapText(element.text, font, fontSize, width - margins.left - margins.right);
      const lineHeight = font.heightAtSize(fontSize);
      if (y - (lines.length * lineHeight) < margins.bottom) addNewPage();

      const ascent = font.heightAtSize(fontSize, { descent: false });
      const descent = font.heightAtSize(fontSize) - ascent;
      let lineY = y - ascent;

      for (const line of lines) {
        const lineWidth = font.widthOfTextAtSize(line, fontSize);
        let x = margins.left;
        if (element.alignment === 'right') x = width - margins.right - lineWidth;
        else if (element.alignment === 'center') x = (width / 2) - (lineWidth / 2);
        currentPage.elements.push({ type: 'text', text: line, x, y: lineY, fontSize, color: element.color, font: getFontName(element), width: lineWidth, ascent, descent });
        lineY -= lineHeight;
      }
      y = lineY;
    } else if ('image' in element) {
      const imageHeight = element.height || 100;
      const imageWidth = element.width || 150;
      if (y - imageHeight < margins.bottom) addNewPage();
      currentPage.elements.push({ type: 'image', image: element.image, x: margins.left, y: y - imageHeight, width: imageWidth, height: imageHeight });
      y -= imageHeight;
    } else if ('table' in element) {
      const { table } = element;
      const { body, widths } = table;
      const cellMargin = 5;
      const fontSize = element.fontSize || 12;
      const availableWidth = width - margins.left - margins.right;
      const numColumns = body[0]?.length || 1;
      let columnWidths: number[];

      if (widths === '*') {
        columnWidths = Array(numColumns).fill(availableWidth / numColumns);
      } else if (Array.isArray(widths)) {
        const measuredWidths = await Promise.all(widths.map(async (w, i) => {
          if (w !== 'auto') return w;
          let maxWidth = 0;
          for (const row of body) {
            const cell = row[i];
            if (!cell) continue;
            const isObjectCell = typeof cell === 'object' && cell !== null;
            const cellText = isObjectCell ? String(cell.text ?? '') : String(cell);
            if(isObjectCell && cell.stack) {
                // Auto-width for stacks in cells is not fully supported, this is a basic implementation
                for(const stackItem of cell.stack) {
                    const itemFont = await getFont(stackItem, fonts, pdfDoc);
                    const textWidth = itemFont.widthOfTextAtSize(stackItem.text, stackItem.fontSize || fontSize);
                    if (textWidth > maxWidth) maxWidth = textWidth;
                }
            } else {
                const cellElement = resolveStyles(isObjectCell ? cell : { text: cellText }, docDefinition.styles);
                const cellFont = await getFont(cellElement, fonts, pdfDoc);
                const textWidth = cellFont.widthOfTextAtSize(cellText, fontSize);
                if (textWidth > maxWidth) maxWidth = textWidth;
            }
          }
          return maxWidth + cellMargin * 2;
        }));
        const fixedWidth = measuredWidths.filter((w): w is number => typeof w === 'number').reduce((a, b) => a + b, 0);
        const starColumnsCount = measuredWidths.filter(w => w === '*').length;
        const remainingWidth = availableWidth - fixedWidth;
        const starWidth = starColumnsCount > 0 ? remainingWidth / starColumnsCount : 0;
        columnWidths = measuredWidths.map(w => (w === '*' ? starWidth : w as number));
      } else {
        columnWidths = Array(numColumns).fill(100);
      }

      const headerRowsCount = table.headerRows || 0;
      const headerRows = body.slice(0, headerRowsCount);
      const bodyRows = body.slice(headerRowsCount);

      const drawRow = async (row: any[], rowIndex: number, isHeader = false) => {
        let maxRowHeight = 0;
        const wrappedCells = [];

        for (let i = 0; i < numColumns; i++) {
            const cell = row[i];
            if (!cell) {
                wrappedCells.push(null);
                continue;
            };

            const isObjectCell = typeof cell === 'object';
            const baseCellElement = isObjectCell ? cell : { text: String(cell) };
            const cellElement = resolveStyles(baseCellElement, docDefinition.styles);

            const colSpan = (cellElement.colSpan && cellElement.colSpan > 1) ? cellElement.colSpan : 1;
            const cellWidth = columnWidths.slice(i, i + colSpan).reduce((a, b) => a + b, 0);

            let totalCellHeight = 0;
            if (cellElement.stack) {
                let stackHeight = 0;
                const processedStack = [];
                for(const stackItem of cellElement.stack) {
                    const itemFont = await getFont(stackItem, fonts, pdfDoc);
                    const itemLineHeight = itemFont.heightAtSize(stackItem.fontSize || fontSize);
                    const lines = wrapText(stackItem.text, itemFont, stackItem.fontSize || fontSize, cellWidth - cellMargin * 2);
                    processedStack.push({ ...stackItem, lines, font: itemFont, lineHeight: itemLineHeight });
                    stackHeight += lines.length * itemLineHeight;
                }
                totalCellHeight = stackHeight + cellMargin * 2;
                wrappedCells.push({ ...cellElement, stack: processedStack, cellWidth });
            } else {
                const cellFont = await getFont(cellElement, fonts, pdfDoc);
                const cellText = String(cellElement.text ?? '');
                const lines = wrapText(cellText, cellFont, fontSize, cellWidth - cellMargin * 2);
                const cellLineHeight = cellFont.heightAtSize(fontSize);
                const cellTextHeight = lines.length * cellLineHeight;
                totalCellHeight = cellTextHeight + cellMargin * 2;
                wrappedCells.push({ ...cellElement, lines, font: cellFont, fontName: getFontName(cellElement), cellWidth, lineHeight: cellLineHeight });
            }

            if (totalCellHeight > maxRowHeight) maxRowHeight = totalCellHeight;

            if (colSpan > 1) {
                for (let j = 1; j < colSpan; j++) { wrappedCells.push(null); }
                i += colSpan - 1;
            }
        }

        const rowHeight = maxRowHeight;
        if (y - rowHeight < margins.bottom && !isHeader) {
            addNewPage();
            for (const [headerIndex, headerRow] of headerRows.entries()) {
                await drawRow(headerRow, headerIndex, true);
            }
        }

        let currentX = margins.left;
        for (let i = 0; i < wrappedCells.length; i++) {
            const cell = wrappedCells[i];
            if (!cell) {
                if (columnWidths[i]) currentX += columnWidths[i];
                continue;
            };

            const fillColor = typeof element.layout?.fillColor === 'function' ? element.layout.fillColor(rowIndex) : element.layout?.fillColor;
            currentPage.elements.push({ type: 'cell', x: currentX, y: y - rowHeight, width: cell.cellWidth, height: rowHeight, fillColor, borderColor: element.layout?.borderColor, borderWidth: element.layout?.borderWidth });

            if (cell.stack) {
                let stackTextHeight = 0;
                cell.stack.forEach((item: any) => stackTextHeight += item.lines.length * item.lineHeight);

                const freeSpace = rowHeight - stackTextHeight - cellMargin * 2;
                let currentStackY = y - cellMargin;
                if (cell.verticalAlignment === 'middle') currentStackY -= freeSpace / 2;
                else if (cell.verticalAlignment === 'bottom') currentStackY -= freeSpace;

                for (const item of cell.stack) {
                    const itemFontSize = item.fontSize || fontSize;
                    const itemFont = item.font;
                    const ascent = itemFont.heightAtSize(itemFontSize, { descent: false });
                    const descent = itemFont.heightAtSize(itemFontSize) - ascent;
                    let lineY = currentStackY - ascent;

                    for (const line of item.lines) {
                         const lineWidth = itemFont.widthOfTextAtSize(line, itemFontSize);
                         let lineX = currentX + cellMargin;
                         const parentAlignment = item.alignment || cell.alignment || element.alignment;
                         if (parentAlignment === 'right') lineX = currentX + cell.cellWidth - cellMargin - lineWidth;
                         else if (parentAlignment === 'center') lineX = currentX + (cell.cellWidth / 2) - (lineWidth / 2);

                         currentPage.elements.push({ type: 'text', text: line, x: lineX, y: lineY, fontSize: itemFontSize, font: getFontName(item), color: item.color, width: lineWidth, ascent, descent });
                         lineY -= item.lineHeight;
                    }
                    currentStackY -= item.lines.length * item.lineHeight;
                }
            } else {
                const textHeight = cell.lines.length * cell.lineHeight;
                const ascent = cell.font.heightAtSize(fontSize, { descent: false });
                const freeSpace = rowHeight - textHeight - cellMargin * 2;
                let blockY = y - cellMargin - ascent;
                if (cell.verticalAlignment === 'middle') blockY -= freeSpace / 2;
                else if (cell.verticalAlignment === 'bottom') blockY -= freeSpace;

                let lineY = blockY;
                const descent = cell.font.heightAtSize(fontSize) - ascent;
                for (const line of cell.lines) {
                    const lineWidth = cell.font.widthOfTextAtSize(line, fontSize);
                    let lineX = currentX + cellMargin;
                    if (cell.alignment === 'right') lineX = currentX + cell.cellWidth - cellMargin - lineWidth;
                    else if (cell.alignment === 'center') lineX = currentX + (cell.cellWidth / 2) - (lineWidth / 2);
                    currentPage.elements.push({ type: 'text', text: line, x: lineX, y: lineY, fontSize, font: cell.fontName, color: cell.color, width: lineWidth, ascent, descent });
                    lineY -= cell.lineHeight;
                }
            }
            currentX += cell.cellWidth;
        }
        y -= rowHeight;
      };
      for (const [headerIndex, headerRow] of headerRows.entries()) {
        await drawRow(headerRow, headerIndex, true);
      }
      for (const [bodyIndex, bodyRow] of bodyRows.entries()) {
        await drawRow(bodyRow, headerRowsCount + bodyIndex, false);
      }
    } else if ('ul' in element || 'ol' in element) {
        const isOrdered = 'ol' in element;
        const items = isOrdered ? element.ol : element.ul;
        const font = await getFont(element, fonts, pdfDoc);
        const fontSize = element.fontSize || 12;
        const lineHeight = font.heightAtSize(fontSize);
        const indent = 20;
        const ascent = font.heightAtSize(fontSize, { descent: false });
        const descent = font.heightAtSize(fontSize) - ascent;
        let counter = 1;
        for (const item of items) {
            const bullet = isOrdered ? `${counter++}.` : '•';
            const bulletWidth = font.widthOfTextAtSize(bullet, fontSize);
            const itemText = wrapText(item, font, fontSize, width - margins.left - margins.right - indent - bulletWidth);
            if (y - (itemText.length * lineHeight) < margins.bottom) addNewPage();
            let lineY = y - ascent;
            const firstLine = itemText.shift() || '';
            const firstLineWidth = font.widthOfTextAtSize(firstLine, fontSize);
            currentPage.elements.push({ type: 'text', text: bullet, x: margins.left, y: lineY, fontSize, font: getFontName(element), width: bulletWidth, ascent, descent });
            currentPage.elements.push({ type: 'text', text: firstLine, x: margins.left + indent, y: lineY, fontSize, font: getFontName(element), width: firstLineWidth, ascent, descent });
            for (const line of itemText) {
                lineY -= lineHeight;
                const lineWidth = font.widthOfTextAtSize(line, fontSize);
                currentPage.elements.push({ type: 'text', text: line, x: margins.left + indent, y: lineY, fontSize, font: getFontName(element), width: lineWidth, ascent, descent });
            }
            y -= (itemText.length + 1) * lineHeight;
        }
    }

     if (element.margin) {
        y -= parseMargins(element.margin).bottom;
    }
  };

  for (const element of content) {
    await layoutElement(element);
  }

  return pages;
}

export async function createPdf(docDefinition: PDFDocumentDefinition, options: { output?: 'uint8array' | 'base64', debug?: { showTextBounds?: boolean } } = {}): Promise<Uint8Array | string> {
  const pdfDoc = await PDFDocument.create();
  const fonts = {};
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
        page.drawText(element.text, { x: element.x, y: element.y, font: fontToUse, size: element.fontSize, color: element.color ? rgb(element.color[0], element.color[1], element.color[2]) : rgb(0, 0, 0) });
        if (options.debug?.showTextBounds) {
            page.drawRectangle({ x: element.x, y: element.y - element.descent, width: element.width, height: element.ascent + element.descent, borderColor: rgb(1, 0, 0), borderWidth: 0.5, opacity: 0 });
        }
      } else if (element.type === 'image') {
        const imageBytes = await fetch(element.image).then((res) => res.arrayBuffer());
        const image = await pdfDoc.embedPng(imageBytes);
        page.drawImage(image, { x: element.x, y: element.y, width: element.width, height: element.height });
      } else if (element.type === 'cell') {
        const rectOptions: any = { x: element.x, y: element.y, width: element.width, height: element.height };
        let shouldDraw = false;
        if (element.fillColor) {
            rectOptions.color = rgb(element.fillColor[0], element.fillColor[1], element.fillColor[2]);
            shouldDraw = true;
        }
        if (element.borderColor) {
            rectOptions.borderColor = rgb(element.borderColor[0], element.borderColor[1], element.borderColor[2]);
            rectOptions.borderWidth = element.borderWidth || 1;
            shouldDraw = true;
            if (!element.fillColor) {
                rectOptions.opacity = 0;
                rectOptions.borderOpacity = 1;
            }
        }
        if (shouldDraw) {
            page.drawRectangle(rectOptions);
        }
      }
    }
    if (docDefinition.footer) {
      const pageNumber = i + 1;
      let footerText = docDefinition.footer.text || '';
      footerText = footerText.replace('{pageNumber}', pageNumber.toString()).replace('{totalPages}', totalPages.toString());
      const footerFont = fonts.Helvetica;
      const fontSize = docDefinition.footer.fontSize || 10;
      const textWidth = footerFont.widthOfTextAtSize(footerText, fontSize);
      const { width } = page.getSize();
      let x = margins.left;
      if (docDefinition.footer.alignment === 'right') x = width - margins.right - textWidth;
      else if (docDefinition.footer.alignment === 'center') x = width / 2 - textWidth / 2;
      page.drawText(footerText, { x, y: margins.bottom / 2, font: footerFont, size: fontSize, color: docDefinition.footer.color ? rgb(docDefinition.footer.color[0], docDefinition.footer.color[1], docDefinition.footer.color[2]) : rgb(0, 0, 0) });
    }
  }
  if (options.output === 'base64') {
    return pdfDoc.saveAsBase64();
  }
  return pdfDoc.save();
}
