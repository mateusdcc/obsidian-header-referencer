export interface Header {
	parent: string;
	name: string;
	header: string;
	file: string;
	filePath: string;
	modifiedTime: number;
	labels: string[];
	metadata: Record<string, string[]>;
}

export interface Category {
	name: string;
	aliases: string[];
}

export interface SuperCategory {
	name: string;
	categories: string[];
}

export type SearchScope = "vault" | "current-file" | "current-folder";
export type SortMode = "category" | "file" | "recency";
export type GroupMode = "none" | "category" | "file";

export interface ValidationIssue {
	filePath: string;
	line: number;
	message: string;
}

export interface PrerequisiteInfo {
	header: string;
	filePath: string;
	uses: string[];
	dependsOn: string[];
	generalizes: string[];
	proofStatus?: string;
}
