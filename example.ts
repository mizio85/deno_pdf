import { createPdf } from './mod.ts';

const longTableBody = [];
for (let i = 1; i <= 50; i++) {
  longTableBody.push([`Row ${i}, Col 1`, `Row ${i}, Col 2`, `Row ${i}, Col 3`]);
}

const docDefinition = {
  pageSize: 'A4',
  pageOrientation: 'landscape',
  content: [
    {
      text: 'A4 Landscape PDF with a Full-Width, Styled, Multi-Page Table',
      fontSize: 20,
      color: [0.1, 0.6, 0.9],
    },
    {
      image: 'https://placehold.co/150x50.png',
    },
    {
      table: {
        widths: '*',
        body: [
          ['Header 1', 'Header 2', 'Header 3'],
          ...longTableBody,
        ],
      },
      fontSize: 12,
      layout: {
        fillColor: [0.9, 0.9, 0.9], // Light gray background for all cells
        borderColor: [0.5, 0.5, 0.5], // Dark gray border
        borderWidth: 0.5,
      },
    },
  ],
};

async function generate() {
  const pdfBytes = await createPdf(docDefinition);
  await Deno.writeFile('example.pdf', pdfBytes);
  console.log('PDF generated successfully with new features!');
}

generate();
