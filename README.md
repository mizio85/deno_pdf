# Deno PDF Generator

This is a simple PDF generator for Deno, inspired by `pdfmake`. It uses `pdf-lib` under the hood.

## Features

- A4/Letter page sizes with portrait/landscape orientation.
- Automatic text wrapping and page overflow.
- Horizontal and vertical alignment for text.
- Flexible table layouts with dynamic column widths and row heights.
- Customizable table styling (fill color, borders), including conditional formatting.
- Page footers with page number placeholders.

## Using as a Module

To use this PDF generator in your own Deno project, you can import the `createPdf` function from the `mod.ts` file.

### TypeScript Support

This module is written in TypeScript and exports a comprehensive set of interfaces for the document definition. You can import these types to get full auto-completion and type-safety in your editor.

```typescript
import { createPdf, PDFDocumentDefinition } from './mod.ts';

const docDefinition: PDFDocumentDefinition = {
  // Your editor will now provide auto-completion and type checking here!
  content: [
    { text: 'Hello, typed world!' }
  ]
};
```

### Remote Import (from a URL)

If you have hosted this module on a service like GitHub, you can import it directly via its raw URL.

```typescript
// Replace with the actual raw URL to your mod.ts file
import { createPdf } from 'https://deno.land/x/your_module/mod.ts';

const docDefinition = { /* ... */ };
const pdfBytes = await createPdf(docDefinition); // Returns Uint8Array by default
const pdfBase64 = await createPdf(docDefinition, { output: 'base64' }); // Returns base64 string
```

### Local Import

If you have the code locally in your project, you can use a relative path.

```typescript
import { createPdf } from './path/to/deno-pdf-generator/mod.ts';

const docDefinition = { /* ... */ };
const pdfBytes = await createPdf(docDefinition);
```

## Example Usage

The following example showcases all the major features of the generator.

```typescript
import { createPdf } from './mod.ts';
import type { PDFDocumentDefinition } from './mod.ts';

const docDefinition: PDFDocumentDefinition = {
  pageSize: 'A4',
  margin: [40, 40, 40, 60],
  styles: {
    header: { fontSize: 24, bold: true, alignment: 'center', margin: [0, 0, 0, 20] },
    subheader: { fontSize: 18, bold: true, margin: [0, 10, 0, 5] },
    tableHeader: { bold: true, fontSize: 13, alignment: 'center' },
    times: { font: 'Times-Roman', italics: true },
  },
  footer: {
    text: 'Page {pageNumber} of {totalPages}',
    alignment: 'center',
    fontSize: 10,
  },
  content: [
    { text: 'Deno PDF Generator - Feature Showcase', style: 'header' },
    { text: 'This document demonstrates all the major features of the Deno PDF Generator module.' },
    {
        text: 'New Features on This Page',
        style: 'subheader',
        pageBreak: 'before',
    },
    { text: 'This text is in Times New Roman, italics.', style: 'times', margin: [0, 0, 0, 10] },
    { text: 'Unordered List:', bold: true },
    {
        ul: [
            'Item 1',
            'Item 2',
            'A long list item that will wrap.',
        ],
        margin: [0, 5, 0, 15]
    },
    { text: 'Ordered List:', bold: true },
    { ol: ['First item', 'Second item', 'Third item'] }
  ],
};

async function generate() {
  const pdfBytes = await createPdf(docDefinition);
  await Deno.writeFile('showcase-example.pdf', pdfBytes as Uint8Array);
  console.log('Showcase PDF generated successfully!');
}

generate();
```

Run the script using Deno:
```bash
deno run --allow-net --allow-write --allow-import example.ts
```

## Document Definition Structure

### Top-Level Properties

- `pageSize`: (Optional) 'A4' or 'Letter'. Defaults to 'A4'.
- `pageOrientation`: (Optional) 'portrait' or 'landscape'. Defaults to 'portrait'.
- `margin`: (Optional) Sets the page margins. Can be a single number for all sides, or an array `[left, top, right, bottom]`. Defaults to `50`.
- `styles`: (Optional) A dictionary of named styles that can be applied to elements.
- `footer`: (Optional) A footer definition to be replicated on all pages.

### Styles

You can define a dictionary of named styles that can be applied to elements using the `style` property. An element's own properties will override those from a style.

Available style properties include `font`, `fontSize`, `bold`, `italics`, `alignment`, `color`, `margin`, and `pageBreak`.

```typescript
const docDefinition = {
  styles: {
    header: { fontSize: 22, bold: true, font: 'Times-Bold' },
    subheader: { fontSize: 16, italics: true, margin: [0, 10, 0, 10] }
  },
  content: [
    { text: 'This is a header', style: 'header' },
    { text: 'This is a subheader', style: 'subheader' }
  ]
}
```

### Footer

You can add a footer that will be replicated on every page by adding a `footer` property to the document definition.

```json
{
  "footer": {
    "text": "Page {pageNumber} of {totalPages} - My Document",
    "alignment": "center",
    "fontSize": 10,
    "color": [0.5, 0.5, 0.5]
  }
}
```
The footer text supports `{pageNumber}` and `{totalPages}` placeholders.

### Content Elements

The `content` property is an array of elements.

#### Text

```json
{
  "text": "Your text here",
  "style": "header",
  "fontSize": 12,
  "color": [0, 0, 0],
  "alignment": "center",
  "bold": true,
  "italics": false,
  "margin": [0, 10, 0, 10]
}
```
- `style`: (Optional) The name of a style from the top-level `styles` dictionary.
- `margin`: (Optional) Per-element margins.
- `pageBreak`: (Optional) Set to `'before'` to force the element to start on a new page.

#### Unordered Lists (ul)

```json
{
  "ul": [
    "First item",
    "Second item"
  ]
}
```

#### Ordered Lists (ol)

```json
{
  "ol": [
    "First item",
    "Second item"
  ]
}
```

#### Images

```json
{
  "image": "https://path/to/your/image.png"
}
```

#### Tables

Tables are defined by an object with `table`, `fontSize`, and `layout` properties.

```json
{
  "style": "tableExample",
  "table": {
    "widths": ["*", 100],
    "body": [
      // ... table rows ...
    ]
  },
  "fontSize": 12,
  "layout": {
    "fillColor": (rowIndex) => (rowIndex % 2 === 0) ? '#CCCCCC' : null,
    "borderColor": [0, 0, 0],
    "borderWidth": 1
  }
}
```

**Table Body Cells:**
A cell can be a simple string, or an object for more control:
```typescript
// Simple cell
"Cell content"

// Cell with style properties
{
  text: "Cell content",
  bold: true,
  italics: true,
  alignment: "center",
  verticalAlignment: "middle"
}
```

**Table Properties:**
- `widths`: Defines column widths. Use `*` for auto-sizing or a number for fixed width.
- `body`: A 2D array of cell content.

**Layout Properties:**
- `fillColor`: An RGB array (e.g., `[0.9, 0.9, 0.9]`) for the cell background color. Can also be a function `(rowIndex) => color` for conditional row-based formatting.
- `borderColor`: An RGB array for the cell border color.
- `borderWidth`: The width of the cell borders.
