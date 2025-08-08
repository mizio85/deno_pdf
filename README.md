# Deno PDF Generator

This is a simple PDF generator for Deno, inspired by `pdfmake`. It uses `pdf-lib` under the hood.

## Usage

To use this generator, import the `createPdf` function from `mod.ts` and pass a document definition object.

```typescript
import { createPdf } from './mod.ts';

const docDefinition = {
  pageSize: 'A4',
  pageOrientation: 'landscape',
  content: [
    {
      text: 'Hello from Deno PDF Generator!',
      fontSize: 20,
      color: [0.2, 0.5, 0.8], // RGB values between 0 and 1
    },
    {
      image: 'https://placehold.co/100x100.png', // URL to a PNG image
    },
    {
      table: {
        widths: '*', // Use '*' for full-width, auto-sized columns
        body: [
          ['Header 1', 'Header 2', 'Header 3'],
          ['One', 'Two', 'Three'],
          ['Four', 'Five', 'Six'],
        ],
      },
      fontSize: 12,
      layout: {
        fillColor: [0.9, 0.9, 0.9],
        borderColor: [0.5, 0.5, 0.5],
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

Then, run the script using Deno:

```bash
deno run --allow-net --allow-write --allow-import example.ts
```

This will create a file named `example.pdf` in the same directory.

## Document Definition Structure

The document definition is a JavaScript object with the following properties:

### Page Setup

- `pageSize`: (Optional) The size of the page. Can be any of the sizes from `pdf-lib`'s `PageSizes` (e.g., 'A4', 'Letter'). Defaults to 'A4'.
- `pageOrientation`: (Optional) The orientation of the page. Can be 'portrait' or 'landscape'. Defaults to 'portrait'.

### Content

The `content` property is an array of elements. Each element is an object that defines a part of the PDF.

#### Text

```json
{
  "text": "Your text here",
  "fontSize": 12,
  "color": [0, 0, 0]
}
```

#### Images

```json
{
  "image": "https://path/to/your/image.png"
}
```
**Note:** Currently, only PNG images from a URL are supported.

#### Tables

```json
{
  "table": {
    "widths": ["*", 100], // Can be '*', an array of numbers, or a mix
    "body": [
      ["Row 1, Col 1", "Row 1, Col 2"],
      ["Row 2, Col 1", "Row 2, Col 2"]
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
**Table Properties:**
- `widths`: Defines the width of each column.
  - `*`: Distributes the available width equally among all `*` columns.
  - `number`: A fixed width in points.
- `body`: A 2D array of strings representing the table content.

**Layout Properties:**
- `fillColor`: An RGB array (e.g., `[0.9, 0.9, 0.9]`) for the cell background color.
- `borderColor`: An RGB array for the cell border color.
- `borderWidth`: The width of the cell borders.
