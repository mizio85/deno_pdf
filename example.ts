import { createPdf } from './mod.ts';

const docDefinition = {
  pageSize: 'A4',
  pageOrientation: 'portrait',
  content: [
    {
      text: 'Vertical Alignment Test',
      fontSize: 24,
      alignment: 'center',
    },
    {
      table: {
        widths: ['*', '*', '*'],
        body: [
          [
            { text: 'Top', alignment: 'center' },
            { text: 'Middle', alignment: 'center' },
            { text: 'Bottom', alignment: 'center' },
          ],
          [
            { text: 'This text is top-aligned.', alignment: 'center', verticalAlignment: 'top' },
            { text: 'This text is middle-aligned.', alignment: 'center', verticalAlignment: 'middle' },
            { text: 'This text is bottom-aligned.', alignment: 'center', verticalAlignment: 'bottom' },
          ],
          [
            { text: 'This cell has a lot more text to demonstrate the vertical alignment with multi-line content. This should be top-aligned.', alignment: 'center', verticalAlignment: 'top' },
            { text: 'This cell has a lot more text to demonstrate the vertical alignment with multi-line content. This should be middle-aligned.', alignment: 'center', verticalAlignment: 'middle' },
            { text: 'This cell has a lot more text to demonstrate the vertical alignment with multi-line content. This should be bottom-aligned.', alignment: 'center', verticalAlignment: 'bottom' },
          ],
        ],
      },
      fontSize: 12,
      layout: {
        borderColor: [0.8, 0.8, 0.8],
        borderWidth: 0.5,
      }
    },
  ],
};

async function generate() {
  const pdfBytes = await createPdf(docDefinition);
  await Deno.writeFile('example.pdf', pdfBytes);
  console.log('Vertical alignment test PDF generated successfully!');
}

generate();
