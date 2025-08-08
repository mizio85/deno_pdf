# Deno PDF Generator

This is a simple PDF generator for Deno, inspired by `pdfmake`. It uses `pdf-lib` under the hood.

## Features

- A4/Letter page sizes with portrait/landscape orientation.
- Automatic text wrapping and page overflow.
- Horizontal and vertical alignment for text.
- Flexible table layouts with dynamic column widths and row heights.
- Customizable table styling (fill color, borders).

## Using as a Module

To use this PDF generator in your own Deno project, you can import the `createPdf` function from the `mod.ts` file.

### Remote Import (from a URL)

If you have hosted this module on a service like GitHub, you can import it directly via its raw URL.

```typescript
// Replace with the actual raw URL to your mod.ts file
import { createPdf } from 'https://deno.land/x/your_module/mod.ts';

const docDefinition = { /* ... */ };
const pdfBytes = await createPdf(docDefinition);
```

### Local Import

If you have the code locally in your project, you can use a relative path.

```typescript
import { createPdf } from './path/to/deno-pdf-generator/mod.ts';

const docDefinition = { /* ... */ };
const pdfBytes = await createPdf(docDefinition);
```

## Example Usage

Here is an example of how to create a document:

```typescript
import { createPdf } from './mod.ts';

const docDefinition = {
  content: [
    {
      text: 'This paragraph is centered and will wrap automatically.',
      fontSize: 12,
      alignment: 'center',
    },
    {
      table: {
        widths: [100, '*', 150],
        body: [
          [
            { text: 'Top Aligned', alignment: 'left' },
            { text: 'Middle Aligned', alignment: 'center', verticalAlignment: 'middle' },
            { text: 'This cell is bottom-right aligned and has a lot of text to demonstrate wrapping.', alignment: 'right', verticalAlignment: 'bottom' },
          ],
        ],
      },
      fontSize: 12,
      layout: {
        fillColor: [0.95, 0.95, 0.95],
        borderColor: [0.8, 0.8, 0.8],
        borderWidth: 0.5,
      }
    },
  ],
};

async function generate() {
  const pdfBytes = await createPdf(docDefinition);
  await Deno.writeFile('example.pdf', pdfBytes);
  console.log('PDF generated successfully!');
}

generate();
```

Run the script using Deno:
```bash
deno run --allow-net --allow-write --allow-import example.ts
```

## Document Definition Structure

### Page Setup

- `pageSize`: (Optional) 'A4' or 'Letter'. Defaults to 'A4'.
- `pageOrientation`: (Optional) 'portrait' or 'landscape'. Defaults to 'portrait'.

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
  "fontSize": 12,
  "color": [0, 0, 0],
  "alignment": "center"
}
```
- `alignment`: (Optional) 'left', 'center', or 'right'. Defaults to 'left'.

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
  "table": {
    "widths": ["*", 100],
    "body": [
      // ... table rows ...
    ]
  },
  "fontSize": 12,
  "layout": {
    "fillColor": [0.9, 0.9, 0.9],
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

// Cell with alignment
{
  text: "Cell content",
  alignment: "center", // 'left', 'center', 'right'
  verticalAlignment: "middle" // 'top', 'middle', 'bottom'
}
```

**Table Properties:**
- `widths`: Defines column widths. Use `*` for auto-sizing or a number for fixed width.
- `body`: A 2D array of cell content.

**Layout Properties:**
- `fillColor`, `borderColor`, `borderWidth`: For styling the table cells.
