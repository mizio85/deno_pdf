# Deno PDF Generator

This is a simple PDF generator for Deno, inspired by `pdfmake`. It uses `pdf-lib` under the hood.

## Usage

To use this generator, import the `createPdf` function from `mod.ts` and pass a document definition object.

```typescript
import { createPdf } from './mod.ts';

const docDefinition = {
  content: [
    {
      text: 'Hello from Deno PDF Generator!',
      fontSize: 20,
      color: [0.2, 0.5, 0.8], // RGB values between 0 and 1
    },
    {
      image: 'https://deno.land/logo.svg', // URL to a PNG image
    },
    {
      table: {
        body: [
          ['Column 1', 'Column 2', 'Column 3'],
          ['One', 'Two', 'Three'],
          ['Four', 'Five', 'Six'],
        ],
      },
      fontSize: 14,
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
deno run --allow-net --allow-write example.ts
```

This will create a file named `example.pdf` in the same directory.

## Document Definition Structure

The document definition is a JavaScript object with a `content` property, which is an array of elements. Each element is an object that defines a part of the PDF.

### Text

```json
{
  "text": "Your text here",
  "fontSize": 12,
  "color": [0, 0, 0]
}
```

### Images

```json
{
  "image": "https://path/to/your/image.png"
}
```
**Note:** Currently, only PNG images from a URL are supported.

### Tables

```json
{
  "table": {
    "body": [
      ["Row 1, Col 1", "Row 1, Col 2"],
      ["Row 2, Col 1", "Row 2, Col 2"]
    ]
  },
  "fontSize": 12
}
```
**Note:** Tables are very basic and have fixed column widths.
