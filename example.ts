import { createPdf } from './mod.ts';

const docDefinition = {
  content: [
    {
      text: 'Hello from Deno PDF Generator!',
      fontSize: 20,
      color: [0.2, 0.5, 0.8],
    },
    {
      image: 'https://placehold.co/100x100.png',
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
