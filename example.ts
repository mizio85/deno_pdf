import { createPdf } from './mod.ts';

const longContent = [];
for (let i = 0; i < 20; i++) {
  longContent.push({
    text: `This is a long paragraph (number ${i + 1}) to ensure that the document spans multiple pages. The footer should be replicated on every page, and the page numbers should update correctly. The quick brown fox jumps over the lazy dog.`,
    fontSize: 12,
  });
  longContent.push({
    table: {
      widths: ['*', '*'],
      body: [
        [`Table on page...`, `...after paragraph ${i + 1}`],
        ['Cell 1', 'Cell 2'],
      ]
    }
  });
}

const docDefinition = {
  pageSize: 'A4',
  pageOrientation: 'portrait',
  footer: {
    text: 'Page {pageNumber} of {totalPages}',
    alignment: 'center',
    fontSize: 10,
    color: [0.5, 0.5, 0.5],
  },
  content: [
    {
      text: 'Document with a Multi-Page Footer',
      fontSize: 24,
      alignment: 'center',
    },
    ...longContent,
  ],
};

async function generate() {
  const pdfBytes = await createPdf(docDefinition);
  await Deno.writeFile('example.pdf', pdfBytes);
  console.log('PDF with footer generated successfully!');
}

generate();
