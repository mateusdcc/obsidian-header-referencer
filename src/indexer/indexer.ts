import { TFile } from "obsidian";
import HeadRef from "src/main";
import { HEADING_REGEX, METADATA_REGEX, parseMarkdownSections } from "src/utils/parser-core";
import { Header, PrerequisiteInfo, SearchScope, SortMode, ValidationIssue } from "src/utils/types";

interface ParsedEntry {
	key: string;
	value: string;
	line: number;
}

interface ParsedSection {
	file: TFile;
	header: string;
	headerLine: number;
	endLine: number;
	entries: ParsedEntry[];
	labels: string[];
}

interface SearchOptions {
	scope: SearchScope;
	anchorFilePath?: string;
	sortMode: SortMode;
}

interface ValidationContext {
	allowedMetadataKeys: Set<string>;
	categoryLookup: Map<string, string>;
}

const BULLET_REGEX = /^\s*-\s+/;

export class ReferenceEngine {
	private plugin: HeadRef;

	constructor(plugin: HeadRef) {
		this.plugin = plugin;
	}

	public async searchReferences(categoryNames: string[], options: SearchOptions): Promise<Header[]> {
		const canonicalTargets = new Set(this.resolveCategoryNames(categoryNames));
		if (canonicalTargets.size === 0) {
			return [];
		}

		const headers: Header[] = [];
		const sections = await this.parseSectionsForScope(options.scope, options.anchorFilePath);
		const categoryLookup = this.getCategoryLookup();

		sections.forEach((section) => {
			const sectionMetadata = this.buildMetadataMap(section.entries);
			section.entries.forEach((entry) => {
				const canonicalCategory = categoryLookup.get(this.normalize(entry.key));
				if (!canonicalCategory || !canonicalTargets.has(canonicalCategory)) {
					return;
				}

				const value = entry.value.trim();
				if (!value) {
					return;
				}

				headers.push(this.buildHeader(section, canonicalCategory, value, sectionMetadata));
			});
		});

		return this.sortHeaders(headers, options.sortMode);
	}

	public async searchByLabels(options: SearchOptions): Promise<Header[]> {
		const headers: Header[] = [];
		const sections = await this.parseSectionsForScope(options.scope, options.anchorFilePath);

		sections.forEach((section) => {
			const sectionMetadata = this.buildMetadataMap(section.entries);
			const metadataLabels = sectionMetadata[this.normalize("Label")] ?? [];
			const allLabels = [...section.labels, ...metadataLabels].filter(
				(label, index, list) => list.indexOf(label) === index
			);
			allLabels.forEach((label) => {
				headers.push(this.buildHeader(section, "Label", label, sectionMetadata));
			});
		});

		return this.sortHeaders(headers, options.sortMode);
	}

	public async listProofsToFinish(options: SearchOptions): Promise<Header[]> {
		const incompleteStates = new Set(["draft", "review", "todo", "incomplete", "wip"]);
		const proofStatusKey = this.normalize(this.plugin.settings.proofStatusKey);
		const headers: Header[] = [];
		const sections = await this.parseSectionsForScope(options.scope, options.anchorFilePath);

		sections.forEach((section) => {
			const metadata = this.buildMetadataMap(section.entries);
			const proofStatuses = metadata[proofStatusKey] ?? [];
			if (proofStatuses.length === 0) {
				return;
			}

			const status = proofStatuses[0];
			if (!incompleteStates.has(this.normalize(status))) {
				return;
			}

			headers.push(this.buildHeader(section, "Proof Status", `${status}: ${section.header}`, metadata));
		});

		return this.sortHeaders(headers, options.sortMode);
	}

	public async getRandomReference(categoryNames: string[], options: SearchOptions): Promise<Header | null> {
		const references = await this.searchReferences(categoryNames, options);
		if (references.length === 0) {
			return null;
		}

		const randomIndex = Math.floor(Math.random() * references.length);
		return references[randomIndex];
	}

	public async getPrerequisitesForLocation(filePath: string, lineNumber: number): Promise<PrerequisiteInfo | null> {
		const targetFile = this.plugin.app.vault.getAbstractFileByPath(filePath);
		if (!(targetFile instanceof TFile)) {
			return null;
		}

		const sections = await this.parseFileSections(targetFile);
		const section = sections.find((candidate) => lineNumber >= candidate.headerLine && lineNumber <= candidate.endLine);
		if (!section) {
			return null;
		}

		const metadata = this.buildMetadataMap(section.entries);
		const proofStatusKey = this.normalize(this.plugin.settings.proofStatusKey);

		return {
			header: section.header,
			filePath: section.file.path,
			uses: metadata[this.normalize("Uses")] ?? [],
			dependsOn: metadata[this.normalize("Depends on")] ?? [],
			generalizes: metadata[this.normalize("Generalizes")] ?? [],
			proofStatus: metadata[proofStatusKey]?.[0]
		};
	}

	public async validateMetadata(options: Omit<SearchOptions, "sortMode">): Promise<ValidationIssue[]> {
		const issues: ValidationIssue[] = [];
		const files = this.getFilesForScope(options.scope, options.anchorFilePath);
		const context = this.getValidationContext();

		for (const file of files) {
			const content = await this.plugin.app.vault.read(file);
			const lines = content.split(/\r?\n/);
			let insideHeader = false;

			lines.forEach((line, index) => {
				const lineNumber = index + 1;
				if (HEADING_REGEX.test(line)) {
					insideHeader = true;
					return;
				}

				if (!line.trim()) {
					return;
				}

				if (BULLET_REGEX.test(line) && !METADATA_REGEX.test(line)) {
					issues.push({
						filePath: file.path,
						line: lineNumber,
						message: "Bullet metadata is malformed. Expected `- Key: Value`."
					});
					return;
				}

				const metadataMatch = line.match(METADATA_REGEX);
				if (!metadataMatch) {
					return;
				}

				const rawKey = metadataMatch[1].trim();
				const rawValue = metadataMatch[2].trim();
				if (!insideHeader) {
					issues.push({
						filePath: file.path,
						line: lineNumber,
						message: "Metadata appears before any markdown header."
					});
					return;
				}

				if (!rawValue) {
					issues.push({
						filePath: file.path,
						line: lineNumber,
						message: "Metadata value is empty."
					});
				}

				const key = this.normalize(rawKey);
				if (!context.allowedMetadataKeys.has(key) && !context.categoryLookup.has(key)) {
					issues.push({
						filePath: file.path,
						line: lineNumber,
						message: `Unknown metadata key: \`${rawKey}\`.`
					});
				}
			});
		}

		return issues.sort((a, b) => {
			const fileComparison = a.filePath.localeCompare(b.filePath);
			if (fileComparison !== 0) {
				return fileComparison;
			}

			return a.line - b.line;
		});
	}

	private buildHeader(section: ParsedSection, parent: string, name: string, metadata: Record<string, string[]>): Header {
		return {
			parent,
			name,
			header: section.header,
			file: section.file.path.replace(/\.[^/.]+$/, ""),
			filePath: section.file.path,
			modifiedTime: section.file.stat.mtime,
			labels: section.labels,
			metadata
		};
	}

	private buildMetadataMap(entries: ParsedEntry[]): Record<string, string[]> {
		const metadata: Record<string, string[]> = {};

		entries.forEach((entry) => {
			const normalizedKey = this.normalize(entry.key);
			if (!metadata[normalizedKey]) {
				metadata[normalizedKey] = [];
			}
			metadata[normalizedKey].push(entry.value.trim());
		});

		return metadata;
	}

	private sortHeaders(headers: Header[], sortMode: SortMode): Header[] {
		return [...headers].sort((a, b) => {
			if (sortMode === "recency") {
				const timeDifference = b.modifiedTime - a.modifiedTime;
				if (timeDifference !== 0) {
					return timeDifference;
				}
			}

			if (sortMode === "file") {
				const fileComparison = a.filePath.localeCompare(b.filePath);
				if (fileComparison !== 0) {
					return fileComparison;
				}
			}

			const categoryComparison = a.parent.localeCompare(b.parent);
			if (sortMode === "category" && categoryComparison !== 0) {
				return categoryComparison;
			}

			const headerComparison = a.header.localeCompare(b.header);
			if (headerComparison !== 0) {
				return headerComparison;
			}

			return a.name.localeCompare(b.name);
		});
	}

	private getValidationContext(): ValidationContext {
		const allowedMetadataKeys = new Set(
			this.plugin.settings.metadataKeys.map((key) => this.normalize(key))
		);
		allowedMetadataKeys.add(this.normalize(this.plugin.settings.proofStatusKey));
		allowedMetadataKeys.add(this.normalize("Label"));

		return {
			allowedMetadataKeys,
			categoryLookup: this.getCategoryLookup()
		};
	}

	private getCategoryLookup(): Map<string, string> {
		const lookup = new Map<string, string>();
		this.plugin.settings.categories.forEach((category) => {
			const canonicalName = category.name.trim();
			if (!canonicalName) {
				return;
			}

			lookup.set(this.normalize(canonicalName), canonicalName);
			category.aliases.forEach((alias) => {
				if (!alias.trim()) {
					return;
				}
				lookup.set(this.normalize(alias), canonicalName);
			});
		});
		return lookup;
	}

	private resolveCategoryNames(names: string[]): string[] {
		const lookup = this.getCategoryLookup();
		const resolved: string[] = [];
		names.forEach((name) => {
			const canonical = lookup.get(this.normalize(name));
			if (canonical && !resolved.includes(canonical)) {
				resolved.push(canonical);
			}
		});
		return resolved;
	}

	private normalize(value: string): string {
		return value.trim().replace(/\s+/g, " ").toLowerCase();
	}

	private async parseSectionsForScope(scope: SearchScope, anchorFilePath?: string): Promise<ParsedSection[]> {
		const files = this.getFilesForScope(scope, anchorFilePath);
		const sections: ParsedSection[] = [];
		for (const file of files) {
			const parsed = await this.parseFileSections(file);
			sections.push(...parsed);
		}
		return sections;
	}

	private getFilesForScope(scope: SearchScope, anchorFilePath?: string): TFile[] {
		const files = this.plugin.app.vault.getMarkdownFiles();
		if (scope === "vault" || !anchorFilePath) {
			return files;
		}

		if (scope === "current-file") {
			return files.filter((file) => file.path === anchorFilePath);
		}

		const anchorFolder = this.getFolderPath(anchorFilePath);
		return files.filter((file) => this.getFolderPath(file.path) === anchorFolder);
	}

	private getFolderPath(filePath: string): string {
		const separatorIndex = filePath.lastIndexOf("/");
		if (separatorIndex === -1) {
			return "";
		}
		return filePath.substring(0, separatorIndex);
	}

	private async parseFileSections(file: TFile): Promise<ParsedSection[]> {
		const content = await this.plugin.app.vault.read(file);
		const parsed = parseMarkdownSections(content) as Array<Omit<ParsedSection, "file">>;
		return parsed.map((section) => ({
			...section,
			file
		}));
	}
}
