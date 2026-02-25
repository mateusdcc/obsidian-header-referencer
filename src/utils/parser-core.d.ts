export interface ParsedCoreEntry {
	key: string;
	value: string;
	line: number;
}

export interface ParsedCoreSection {
	header: string;
	headerLine: number;
	endLine: number;
	entries: ParsedCoreEntry[];
	labels: string[];
}

export const HEADING_REGEX: RegExp;
export const METADATA_REGEX: RegExp;
export const LABEL_REGEX: RegExp;
export function parseMarkdownSections(content: string): ParsedCoreSection[];
