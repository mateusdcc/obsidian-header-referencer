import { Editor, MarkdownView, Notice, Plugin } from "obsidian";
import { InfoListModal, ResultModal } from "./indexer/interface";
import { ReferenceEngine } from "./indexer/indexer";
import { normalizePluginSettings, PluginSettingTabImpl, PluginSettings } from "./settings";
import { buildCommandId } from "./utils/command-core";
import { Category, Header, SearchScope, SuperCategory } from "./utils/types";

const SCOPES: SearchScope[] = ["vault", "current-file", "current-folder"];

export default class HeadRef extends Plugin {
	settings!: PluginSettings;
	private dynamicCommandIds: string[] = [];

	async onload() {
		await this.loadSettings();
		this.registerStaticCommands();
		this.refreshDynamicCommands();
		this.addSettingTab(new PluginSettingTabImpl(this.app, this));
	}

	private registerStaticCommands() {
		this.addSearchCommand("search-all-default", "All references list", () => this.settings.categories.map((category) => category.name));
		this.addSearchCommand("search-all-vault", "All references list (vault)", () => this.settings.categories.map((category) => category.name), "vault");
		this.addSearchCommand("search-all-current-file", "All references list (current file)", () => this.settings.categories.map((category) => category.name), "current-file");
		this.addSearchCommand("search-all-current-folder", "All references list (current folder)", () => this.settings.categories.map((category) => category.name), "current-folder");

		this.addCommand({
			id: "search-labels",
			name: "List references by LaTeX label",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const engine = new ReferenceEngine(this);
				const scope = this.settings.defaultScope;
				const headers = await engine.searchByLabels({
					scope,
					anchorFilePath: this.getAnchorFilePath(view),
					sortMode: this.settings.sortMode
				});
				await this.openResultModal(editor, headers, "No labels found.");
			}
		});
		this.addCommand({
			id: "search-labels-vault",
			name: "List references by LaTeX label (vault)",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const engine = new ReferenceEngine(this);
				const headers = await engine.searchByLabels({
					scope: "vault",
					anchorFilePath: this.getAnchorFilePath(view),
					sortMode: this.settings.sortMode
				});
				await this.openResultModal(editor, headers, "No labels found.");
			}
		});
		this.addCommand({
			id: "search-labels-current-file",
			name: "List references by LaTeX label (current file)",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const engine = new ReferenceEngine(this);
				const headers = await engine.searchByLabels({
					scope: "current-file",
					anchorFilePath: this.getAnchorFilePath(view),
					sortMode: this.settings.sortMode
				});
				await this.openResultModal(editor, headers, "No labels found.");
			}
		});
		this.addCommand({
			id: "search-labels-current-folder",
			name: "List references by LaTeX label (current folder)",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const engine = new ReferenceEngine(this);
				const headers = await engine.searchByLabels({
					scope: "current-folder",
					anchorFilePath: this.getAnchorFilePath(view),
					sortMode: this.settings.sortMode
				});
				await this.openResultModal(editor, headers, "No labels found.");
			}
		});

		this.addCommand({
			id: "search-proofs-to-finish",
			name: "List proofs to finish",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const engine = new ReferenceEngine(this);
				const scope = this.settings.defaultScope;
				const headers = await engine.listProofsToFinish({
					scope,
					anchorFilePath: this.getAnchorFilePath(view),
					sortMode: this.settings.sortMode
				});
				await this.openResultModal(editor, headers, "No unfinished proofs found.");
			}
		});
		this.addCommand({
			id: "search-proofs-to-finish-vault",
			name: "List proofs to finish (vault)",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const engine = new ReferenceEngine(this);
				const headers = await engine.listProofsToFinish({
					scope: "vault",
					anchorFilePath: this.getAnchorFilePath(view),
					sortMode: this.settings.sortMode
				});
				await this.openResultModal(editor, headers, "No unfinished proofs found.");
			}
		});
		this.addCommand({
			id: "search-proofs-to-finish-current-file",
			name: "List proofs to finish (current file)",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const engine = new ReferenceEngine(this);
				const headers = await engine.listProofsToFinish({
					scope: "current-file",
					anchorFilePath: this.getAnchorFilePath(view),
					sortMode: this.settings.sortMode
				});
				await this.openResultModal(editor, headers, "No unfinished proofs found.");
			}
		});
		this.addCommand({
			id: "search-proofs-to-finish-current-folder",
			name: "List proofs to finish (current folder)",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const engine = new ReferenceEngine(this);
				const headers = await engine.listProofsToFinish({
					scope: "current-folder",
					anchorFilePath: this.getAnchorFilePath(view),
					sortMode: this.settings.sortMode
				});
				await this.openResultModal(editor, headers, "No unfinished proofs found.");
			}
		});

		this.addCommand({
			id: "random-theorem-definition",
			name: "Random theorem/definition",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const engine = new ReferenceEngine(this);
				const randomReference = await engine.getRandomReference(["Theorem", "Definition"], {
					scope: this.settings.defaultScope,
					anchorFilePath: this.getAnchorFilePath(view),
					sortMode: this.settings.sortMode
				});

				if (!randomReference) {
					new Notice("No theorem/definition references found.");
					return;
				}

				await this.openResultModal(editor, [randomReference], "No theorem/definition references found.");
			}
		});

		this.addCommand({
			id: "show-current-prerequisites",
			name: "Show prerequisites for current header",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const file = view.file;
				if (!file) {
					new Notice("No active file found.");
					return;
				}

				const lineNumber = editor.getCursor().line + 1;
				const engine = new ReferenceEngine(this);
				const info = await engine.getPrerequisitesForLocation(file.path, lineNumber);
				if (!info) {
					new Notice("No header context found at current cursor.");
					return;
				}

				const entries: string[] = [
					`Header: ${info.header}`,
					`File: ${info.filePath}`,
					`Uses: ${info.uses.join(", ") || "None"}`,
					`Depends on: ${info.dependsOn.join(", ") || "None"}`,
					`Generalizes: ${info.generalizes.join(", ") || "None"}`,
					`Proof status: ${info.proofStatus ?? "Not set"}`
				];
				new InfoListModal(this.app, "Prerequisites", entries).open();
			}
		});

		this.addCommand({
			id: "validate-header-metadata",
			name: "Validate header metadata format",
			editorCallback: async (_editor: Editor, view: MarkdownView) => {
				const engine = new ReferenceEngine(this);
				const scope = this.settings.defaultScope;
				const issues = await engine.validateMetadata({
					scope,
					anchorFilePath: this.getAnchorFilePath(view)
				});

				if (issues.length === 0) {
					new Notice("No metadata issues found.");
					return;
				}

				const items = issues.map((issue) => `${issue.filePath}:${issue.line} - ${issue.message}`);
				new InfoListModal(this.app, "Metadata Validation", items, "Fix these entries to keep the index clean.").open();
			}
		});
	}

	private addSearchCommand(
		id: string,
		name: string,
		categoriesProvider: () => string[],
		scope?: SearchScope
	) {
		this.addCommand({
			id,
			name,
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const engine = new ReferenceEngine(this);
				const resolvedScope = scope ?? this.settings.defaultScope;
				const headers = await engine.searchReferences(categoriesProvider(), {
					scope: resolvedScope,
					anchorFilePath: this.getAnchorFilePath(view),
					sortMode: this.settings.sortMode
				});
				await this.openResultModal(editor, headers, "No references found.");
			}
		});
	}

	private async openResultModal(editor: Editor, headers: Header[], emptyMessage: string) {
		if (headers.length === 0) {
			new Notice(emptyMessage);
			return;
		}

		new ResultModal(this.app, headers, editor, {
			groupMode: this.settings.groupMode,
			previewBeforeInsert: this.settings.previewBeforeInsert
		}).open();
	}

	private getAnchorFilePath(view: MarkdownView): string | undefined {
		return view.file?.path ?? this.app.workspace.getActiveFile()?.path;
	}

	private addCategoryCommand(category: Category, index: number) {
		const baseId = buildCommandId("search-category", category.name, index);
		this.dynamicCommandIds.push(baseId);
		this.addSearchCommand(baseId, `List all ${category.name.toLowerCase()}`, () => [category.name]);

		SCOPES.forEach((scope) => {
			const scopedId = `${baseId}-${scope}`;
			this.dynamicCommandIds.push(scopedId);
			this.addSearchCommand(
				scopedId,
				`List all ${category.name.toLowerCase()} (${this.scopeLabel(scope)})`,
				() => [category.name],
				scope
			);
		});
	}

	private addSuperCategoryCommand(superCategory: SuperCategory, index: number) {
		const baseId = buildCommandId("search-super-category", superCategory.name, index);
		this.dynamicCommandIds.push(baseId);
		this.addSearchCommand(
			baseId,
			`Supercategory list ${superCategory.name.toLowerCase()}`,
			() => superCategory.categories
		);

		SCOPES.forEach((scope) => {
			const scopedId = `${baseId}-${scope}`;
			this.dynamicCommandIds.push(scopedId);
			this.addSearchCommand(
				scopedId,
				`Supercategory list ${superCategory.name.toLowerCase()} (${this.scopeLabel(scope)})`,
				() => superCategory.categories,
				scope
			);
		});
	}

	private scopeLabel(scope: SearchScope): string {
		if (scope === "current-file") {
			return "current file";
		}
		if (scope === "current-folder") {
			return "current folder";
		}
		return "vault";
	}

	refreshDynamicCommands() {
		const commandManager = this.app.commands as unknown as {
			removeCommand?: (id: string) => void;
			commands?: Record<string, unknown>;
		};

		this.dynamicCommandIds.forEach((commandId) => {
			const fullId = `${this.manifest.id}:${commandId}`;
			commandManager.removeCommand?.(fullId);
			if (!commandManager.removeCommand && commandManager.commands) {
				delete commandManager.commands[fullId];
			}
		});
		this.dynamicCommandIds = [];

		this.settings.categories.forEach((category, index) => {
			this.addCategoryCommand(category, index);
		});

		this.settings.superCategories.forEach((superCategory, index) => {
			this.addSuperCategoryCommand(superCategory, index);
		});
	}

	onunload() {
	}

	async loadSettings() {
		const settings = await this.loadData();
		this.settings = normalizePluginSettings(this, settings);
	}

	async saveSettings() {
		this.settings = normalizePluginSettings(this, this.settings);
		await this.saveData(this.settings);
		this.refreshDynamicCommands();
	}
}
