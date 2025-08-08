export type Color = [number, number, number];
export type Alignment = 'left' | 'center' | 'right';
export type VerticalAlignment = 'top' | 'middle' | 'bottom';

export interface TextElement {
  text: string;
  style?: string | string[];
  pageBreak?: 'before';
  fontSize?: number;
  color?: Color;
  alignment?: Alignment;
}

export interface ImageElement {
  image: string; // URL
  style?: string | string[];
  pageBreak?: 'before';
  width?: number;
  height?: number;
}

export type TableCell = string | {
  text: string;
  alignment?: Alignment;
  verticalAlignment?: VerticalAlignment;
};

export interface TableLayout {
    fillColor?: Color | ((rowIndex: number) => Color | null);
    borderColor?: Color;
    borderWidth?: number;
}

export interface TableElement {
  style?: string | string[];
  pageBreak?: 'before';
  table: {
    widths: ('*' | number)[] | '*';
    body: TableCell[][];
  };
  fontSize?: number;
  layout?: TableLayout;
}

export interface UnorderedListElement {
    ul: string[];
    style?: string | string[];
    pageBreak?: 'before';
    // Future: support nested lists by making this (string | UnorderedListElement | OrderedListElement)[]
}

export interface OrderedListElement {
    ol: string[];
    style?: string | string[];
    pageBreak?: 'before';
}

export type ContentElement = TextElement | ImageElement | TableElement | UnorderedListElement | OrderedListElement;

export interface FooterElement {
    text: string;
    alignment?: Alignment;
    fontSize?: number;
    color?: Color;
}

export type StandardFont =
  | 'Courier'
  | 'Courier-Bold'
  | 'Courier-Oblique'
  | 'Courier-BoldOblique'
  | 'Helvetica'
  | 'Helvetica-Bold'
  | 'Helvetica-Oblique'
  | 'Helvetica-BoldOblique'
  | 'Times-Roman'
  | 'Times-Bold'
  | 'Times-Italic'
  | 'Times-BoldItalic'
  | 'Symbol'
  | 'ZapfDingbats';

export interface Style {
    font?: StandardFont;
    fontSize?: number;
    bold?: boolean;
    italics?: boolean;
    alignment?: Alignment;
    color?: Color;
    margin?: number | [number, number, number, number];
    pageBreak?: 'before';
}

export interface PDFDocumentDefinition {
  pageSize?: 'A4' | 'Letter';
  pageOrientation?: 'portrait' | 'landscape';
  margin?: number | [number, number, number, number]; // [left, top, right, bottom]
  styles?: { [key: string]: Style };
  footer?: FooterElement;
  content: ContentElement[];
}
