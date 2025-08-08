export type Color = [number, number, number];
export type Alignment = 'left' | 'center' | 'right';
export type VerticalAlignment = 'top' | 'middle' | 'bottom';

export interface TextElement {
  text: string;
  style?: string | string[];
  fontSize?: number;
  color?: Color;
  alignment?: Alignment;
}

export interface ImageElement {
  image: string; // URL
  style?: string | string[];
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
  table: {
    widths: ('*' | number)[] | '*';
    body: TableCell[][];
  };
  fontSize?: number;
  layout?: TableLayout;
}

export type ContentElement = TextElement | ImageElement | TableElement;

export interface FooterElement {
    text: string;
    alignment?: Alignment;
    fontSize?: number;
    color?: Color;
}

export interface Style {
    font?: string;
    fontSize?: number;
    bold?: boolean;
    italics?: boolean;
    alignment?: Alignment;
    color?: Color;
    margin?: number | [number, number, number, number];
}

export interface PDFDocumentDefinition {
  pageSize?: 'A4' | 'Letter';
  pageOrientation?: 'portrait' | 'landscape';
  margin?: number | [number, number, number, number]; // [left, top, right, bottom]
  styles?: { [key: string]: Style };
  footer?: FooterElement;
  content: ContentElement[];
}
