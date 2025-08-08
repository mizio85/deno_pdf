import { createPdf } from './mod.ts';

const docDefinition = {
  pageSize: 'A4',
  pageOrientation: 'portrait',
  content: [
    {
      text: 'Text Alignment and Wrapping Demo',
      fontSize: 24,
      alignment: 'center',
      color: [0.1, 0.6, 0.9],
    },
    {
      text: 'This is a long paragraph that should wrap automatically to fit the page width. The quick brown fox jumps over the lazy dog. This demonstrates the automatic text wrapping feature for simple text elements. It should be aligned to the right.',
      fontSize: 12,
      alignment: 'right',
    },
    {
      text: 'This paragraph is centered. It also contains a good amount of text to ensure that the wrapping functionality is properly tested and that the centered alignment is applied to all lines.',
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
            { text: 'Bottom Aligned', alignment: 'right', verticalAlignment: 'bottom' },
          ],
          [
            'This cell has a lot of text that needs to be wrapped. It should demonstrate the automatic wrapping and dynamic row height calculation. The alignment is default (top-left).',
            { text: 'This cell is centered both horizontally and vertically.', alignment: 'center', verticalAlignment: 'middle' },
            { text: 'This cell is bottom-right aligned.', alignment: 'right', verticalAlignment: 'bottom' },
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
  console.log('PDF with advanced text layout generated successfully!');
}

generate();
