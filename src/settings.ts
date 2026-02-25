import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import HeadRef from "./main";
import { Category, GroupMode, SearchScope, SortMode, SuperCategory } from "./utils/types";

export interface PluginSettings {
	version: string;
	categories: Category[];
	superCategories: SuperCategory[];
	metadataKeys: string[];
	proofStatusKey: string;
	defaultScope: SearchScope;
	sortMode: SortMode;
	groupMode: GroupMode;
	previewBeforeInsert: boolean;
}

const DEFAULT_SETTINGS_STATIC: Omit<PluginSettings, "version"> = {
	categories: [
		{ name: "Definition", aliases: ["Def", "Def."] },
		{ name: "Theorem", aliases: ["Thm", "Thm."] },
		{ name: "Lemma", aliases: [] },
		{ name: "Proposition", aliases: ["Prop", "Prop."] },
		{ name: "Corollary", aliases: ["Cor"] },
		{ name: "Proof", aliases: ["Pf", "Pf."] },
		{ name: "Example", aliases: ["Ex", "Ex."] },
		{ name: "Counterexample", aliases: ["Cex"] },
		{ name: "Remark", aliases: ["Rem", "Rem."] },
		{ name: "Notation", aliases: ["Not."] },
	],
	superCategories: [
		{
			name: "Statements",
			categories: ["Theorem", "Lemma", "Proposition", "Corollary"]
		},
		{
			name: "Supporting Notes",
			categories: ["Definition", "Notation", "Remark", "Example", "Counterexample"]
		}
	],
	metadataKeys: ["Uses", "Depends on", "Generalizes", "Label"],
	proofStatusKey: "Proof status",
	defaultScope: "vault",
	sortMode: "category",
	groupMode: "none",
	previewBeforeInsert: true
};

function cloneDefaultSettingsStatic(): Omit<PluginSettings, "version"> {
	return {
		categories: DEFAULT_SETTINGS_STATIC.categories.map((category) => ({
			name: category.name,
			aliases: [...category.aliases]
		})),
		superCategories: DEFAULT_SETTINGS_STATIC.superCategories.map((superCategory) => ({
			name: superCategory.name,
			categories: [...superCategory.categories]
		})),
		metadataKeys: [...DEFAULT_SETTINGS_STATIC.metadataKeys],
		proofStatusKey: DEFAULT_SETTINGS_STATIC.proofStatusKey,
		defaultScope: DEFAULT_SETTINGS_STATIC.defaultScope,
		sortMode: DEFAULT_SETTINGS_STATIC.sortMode,
		groupMode: DEFAULT_SETTINGS_STATIC.groupMode,
		previewBeforeInsert: DEFAULT_SETTINGS_STATIC.previewBeforeInsert
	};
}

export function DEFAULT_SETTINGS(plugin: HeadRef): PluginSettings {
	return {
		version: plugin.manifest.version,
		...cloneDefaultSettingsStatic()
	};
}

export function normalizePluginSettings(plugin: HeadRef, rawSettings: unknown): PluginSettings {
	const defaults = DEFAULT_SETTINGS(plugin);
	if (!rawSettings || typeof rawSettings !== "object") {
		return defaults;
	}

	const candidate = rawSettings as Partial<PluginSettings> & {
		categories?: Array<{ name?: string; aliases?: string[] | string }>;
		superCategories?: Array<{ name?: string; categories?: string[] | Array<{ name?: string }> }>;
	};

	const categories = normalizeCategories(candidate.categories ?? defaults.categories);
	const categoryNames = new Set(categories.map((category) => normalizeKey(category.name)));
	const superCategories = normalizeSuperCategories(candidate.superCategories ?? defaults.superCategories, categoryNames);

	return {
		version: plugin.manifest.version,
		categories,
		superCategories,
		metadataKeys: normalizeList(candidate.metadataKeys, defaults.metadataKeys),
		proofStatusKey: normalizeLabel(candidate.proofStatusKey, defaults.proofStatusKey),
		defaultScope: normalizeScope(candidate.defaultScope, defaults.defaultScope),
		sortMode: normalizeSort(candidate.sortMode, defaults.sortMode),
		groupMode: normalizeGroup(candidate.groupMode, defaults.groupMode),
		previewBeforeInsert: typeof candidate.previewBeforeInsert === "boolean"
			? candidate.previewBeforeInsert
			: defaults.previewBeforeInsert
	};
}

function normalizeCategories(categories: Array<{ name?: string; aliases?: string[] | string }>): Category[] {
	const normalized = categories
		.map((category) => {
			const name = normalizeLabel(category.name, "");
			if (!name) {
				return null;
			}

			const aliasesSource = Array.isArray(category.aliases)
				? category.aliases
				: typeof category.aliases === "string"
					? splitCommaList(category.aliases)
					: [];

			const aliases = normalizeList(aliasesSource, []).filter((alias) => normalizeKey(alias) !== normalizeKey(name));
			return {
				name,
				aliases
			};
		})
		.filter((category): category is Category => Boolean(category));

	if (normalized.length === 0) {
		return cloneDefaultSettingsStatic().categories;
	}

	return dedupeCategories(normalized);
}

function normalizeSuperCategories(
	superCategories: Array<{ name?: string; categories?: string[] | Array<{ name?: string }> }>,
	categoryNames: Set<string>
): SuperCategory[] {
	const normalized = superCategories
		.map((superCategory) => {
			const name = normalizeLabel(superCategory.name, "");
			if (!name) {
				return null;
			}

			const rawCategories = Array.isArray(superCategory.categories) ? superCategory.categories : [];
			const parsedCategories = rawCategories
				.map((category) => {
					if (typeof category === "string") {
						return normalizeLabel(category, "");
					}
					return normalizeLabel(category?.name, "");
				})
				.filter(Boolean)
				.filter((categoryName, index, list) => list.indexOf(categoryName) === index)
				.filter((categoryName) => categoryNames.has(normalizeKey(categoryName)));

			if (parsedCategories.length === 0) {
				return null;
			}

			return {
				name,
				categories: parsedCategories
			};
		})
		.filter((superCategory): superCategory is SuperCategory => Boolean(superCategory));

	return dedupeSuperCategories(normalized);
}

function dedupeCategories(categories: Category[]): Category[] {
	const seen = new Set<string>();
	const deduped: Category[] = [];
	categories.forEach((category) => {
		const key = normalizeKey(category.name);
		if (seen.has(key)) {
			return;
		}
		seen.add(key);
		deduped.push(category);
	});
	return deduped;
}

function dedupeSuperCategories(superCategories: SuperCategory[]): SuperCategory[] {
	const seen = new Set<string>();
	const deduped: SuperCategory[] = [];
	superCategories.forEach((superCategory) => {
		const key = normalizeKey(superCategory.name);
		if (seen.has(key)) {
			return;
		}
		seen.add(key);
		deduped.push(superCategory);
	});
	return deduped;
}

function normalizeList(values: unknown, fallback: string[]): string[] {
	if (!Array.isArray(values)) {
		return fallback;
	}

	return values
		.map((value) => normalizeLabel(typeof value === "string" ? value : "", ""))
		.filter(Boolean)
		.filter((value, index, list) => list.indexOf(value) === index);
}

function normalizeLabel(value: unknown, fallback: string): string {
	if (typeof value !== "string") {
		return fallback;
	}
	return value.trim().replace(/\s+/g, " ");
}

function normalizeScope(value: unknown, fallback: SearchScope): SearchScope {
	return value === "current-file" || value === "current-folder" || value === "vault"
		? value
		: fallback;
}

function normalizeSort(value: unknown, fallback: SortMode): SortMode {
	return value === "category" || value === "file" || value === "recency"
		? value
		: fallback;
}

function normalizeGroup(value: unknown, fallback: GroupMode): GroupMode {
	return value === "none" || value === "category" || value === "file"
		? value
		: fallback;
}

function splitCommaList(input: string): string[] {
	return input
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function normalizeKey(value: string): string {
	return value.trim().toLowerCase();
}

function hasCategoryConflicts(categories: Category[]): string | null {
	const seenKeys = new Map<string, string>();
	for (const category of categories) {
		const keys = [category.name, ...category.aliases].map((value) => normalizeKey(value));
		for (const key of keys) {
			const owner = seenKeys.get(key);
			if (owner && owner !== category.name) {
				return `Conflict detected: \`${key}\` is shared by "${owner}" and "${category.name}".`;
			}
			seenKeys.set(key, category.name);
		}
	}
	return null;
}

export class PluginSettingTabImpl extends PluginSettingTab {
	plugin: HeadRef;

	constructor(app: App, plugin: HeadRef) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h1", { text: "Header Referencer Settings" });
		containerEl.createEl("p", {
			text: "Configure category aliases, super categories, metadata keys, and search behavior for dense math notes."
		});

		this.renderBehaviorSettings(containerEl);
		this.renderMetadataSettings(containerEl);
		this.renderCategories(containerEl);
		this.renderSuperCategories(containerEl);
	}

	private renderBehaviorSettings(containerEl: HTMLElement) {
		containerEl.createEl("h2", { text: "Search Behavior" });

		new Setting(containerEl)
			.setName("Default scope")
			.setDesc("Used by non-scoped commands like `List all definition`.")
			.addDropdown((dropdown) => {
				dropdown.addOption("vault", "Whole vault");
				dropdown.addOption("current-file", "Current file");
				dropdown.addOption("current-folder", "Current folder");
				dropdown.setValue(this.plugin.settings.defaultScope);
				dropdown.onChange(async (value) => {
					this.plugin.settings.defaultScope = normalizeScope(value, this.plugin.settings.defaultScope);
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Sort mode")
			.setDesc("Controls the order in result lists.")
			.addDropdown((dropdown) => {
				dropdown.addOption("category", "Category");
				dropdown.addOption("file", "File");
				dropdown.addOption("recency", "Recency");
				dropdown.setValue(this.plugin.settings.sortMode);
				dropdown.onChange(async (value) => {
					this.plugin.settings.sortMode = normalizeSort(value, this.plugin.settings.sortMode);
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Group hint")
			.setDesc("Adds grouping cues in suggestions.")
			.addDropdown((dropdown) => {
				dropdown.addOption("none", "No grouping");
				dropdown.addOption("category", "Category");
				dropdown.addOption("file", "File");
				dropdown.setValue(this.plugin.settings.groupMode);
				dropdown.onChange(async (value) => {
					this.plugin.settings.groupMode = normalizeGroup(value, this.plugin.settings.groupMode);
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Preview before insert")
			.setDesc("Show a quick confirmation modal before inserting a reference link.")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.previewBeforeInsert);
				toggle.onChange(async (value) => {
					this.plugin.settings.previewBeforeInsert = value;
					await this.plugin.saveSettings();
				});
			});
	}

	private renderMetadataSettings(containerEl: HTMLElement) {
		containerEl.createEl("h2", { text: "Metadata Keys" });

		new Setting(containerEl)
			.setName("Structured metadata keys")
			.setDesc("Comma-separated keys recognized under headers, e.g. Uses, Depends on, Generalizes.")
			.addTextArea((textArea) => {
				textArea.setValue(this.plugin.settings.metadataKeys.join(", "));
				textArea.onChange(async (value) => {
					this.plugin.settings.metadataKeys = splitCommaList(value);
					await this.plugin.saveSettings();
				});
				textArea.inputEl.rows = 2;
				textArea.inputEl.style.width = "100%";
			});

		new Setting(containerEl)
			.setName("Proof status key")
			.setDesc("Metadata key used by `List proofs to finish`.")
			.addText((text) => {
				text.setValue(this.plugin.settings.proofStatusKey);
				text.onChange(async (value) => {
					const normalized = normalizeLabel(value, this.plugin.settings.proofStatusKey);
					this.plugin.settings.proofStatusKey = normalized || this.plugin.settings.proofStatusKey;
					await this.plugin.saveSettings();
				});
			});
	}

	private renderCategories(containerEl: HTMLElement) {
		containerEl.createEl("h2", { text: "Categories" });
		containerEl.createEl("p", {
			text: "Each category can have aliases. Commands are generated from canonical names."
		});

		new Setting(containerEl)
			.setName("Add category")
			.addButton((button) => {
				button.setButtonText("Add");
				button.onClick(async () => {
					this.plugin.settings.categories.push({ name: "New Category", aliases: [] });
					await this.plugin.saveSettings();
					this.display();
				});
			});

		this.plugin.settings.categories.forEach((category, index) => {
			const draft = {
				name: category.name,
				aliases: category.aliases.join(", ")
			};

			new Setting(containerEl)
				.setName(`Category ${index + 1}`)
				.setDesc("Canonical name and aliases")
				.addText((text) => {
					text.setPlaceholder("Definition");
					text.setValue(draft.name);
					text.onChange((value) => {
						draft.name = value;
					});
				})
				.addText((text) => {
					text.setPlaceholder("Def, Def.");
					text.setValue(draft.aliases);
					text.onChange((value) => {
						draft.aliases = value;
					});
				})
				.addButton((button) => {
					button.setButtonText("Save");
					button.onClick(async () => {
						const newName = normalizeLabel(draft.name, "");
						if (!newName) {
							new Notice("Category name cannot be empty.");
							return;
						}

						const oldName = this.plugin.settings.categories[index].name;
						const aliases = splitCommaList(draft.aliases).filter((alias) => normalizeKey(alias) !== normalizeKey(newName));
						this.plugin.settings.categories[index] = {
							name: newName,
							aliases
						};

						this.renameCategoryInSuperCategories(oldName, newName);
						const conflict = hasCategoryConflicts(this.plugin.settings.categories);
						if (conflict) {
							new Notice(conflict);
							this.plugin.settings.categories[index] = category;
							return;
						}

						await this.plugin.saveSettings();
						this.display();
					});
				})
				.addButton((button) => {
					button.setButtonText("Delete");
					button.onClick(async () => {
						const deleted = this.plugin.settings.categories[index];
						this.plugin.settings.categories.splice(index, 1);
						this.plugin.settings.superCategories = this.plugin.settings.superCategories
							.map((superCategory) => ({
								...superCategory,
								categories: superCategory.categories.filter(
									(categoryName) => normalizeKey(categoryName) !== normalizeKey(deleted.name)
								)
							}))
							.filter((superCategory) => superCategory.categories.length > 0);

						await this.plugin.saveSettings();
						this.display();
					});
				});
		});
	}

	private renderSuperCategories(containerEl: HTMLElement) {
		containerEl.createEl("h2", { text: "Super Categories" });
		containerEl.createEl("p", {
			text: "Group categories and get one command per super category."
		});

		new Setting(containerEl)
			.setName("Add super category")
			.addButton((button) => {
				button.setButtonText("Add");
				button.onClick(async () => {
					const defaults = this.plugin.settings.categories.slice(0, 2).map((category) => category.name);
					this.plugin.settings.superCategories.push({
						name: "New Super Category",
						categories: defaults
					});
					await this.plugin.saveSettings();
					this.display();
				});
			});

		const categoryNameSet = new Set(this.plugin.settings.categories.map((category) => normalizeKey(category.name)));
		this.plugin.settings.superCategories.forEach((superCategory, index) => {
			const draft = {
				name: superCategory.name,
				categories: superCategory.categories.join(", ")
			};

			new Setting(containerEl)
				.setName(`Super Category ${index + 1}`)
				.setDesc("Name and comma-separated category names")
				.addText((text) => {
					text.setPlaceholder("Statements");
					text.setValue(draft.name);
					text.onChange((value) => {
						draft.name = value;
					});
				})
				.addTextArea((textArea) => {
					textArea.setPlaceholder("Theorem, Lemma, Proposition");
					textArea.setValue(draft.categories);
					textArea.onChange((value) => {
						draft.categories = value;
					});
					textArea.inputEl.rows = 2;
					textArea.inputEl.style.width = "100%";
				})
				.addButton((button) => {
					button.setButtonText("Save");
					button.onClick(async () => {
						const name = normalizeLabel(draft.name, "");
						const categories = splitCommaList(draft.categories);
						if (!name) {
							new Notice("Super category name cannot be empty.");
							return;
						}
						if (categories.length === 0) {
							new Notice("Super category must include at least one category.");
							return;
						}

						const unknownCategories = categories.filter(
							(categoryName) => !categoryNameSet.has(normalizeKey(categoryName))
						);
						if (unknownCategories.length > 0) {
							new Notice(`Unknown categories: ${unknownCategories.join(", ")}`);
							return;
						}

						this.plugin.settings.superCategories[index] = {
							name,
							categories
						};

						const duplicateName = this.plugin.settings.superCategories.some((candidate, candidateIndex) =>
							candidateIndex !== index && normalizeKey(candidate.name) === normalizeKey(name)
						);
						if (duplicateName) {
							new Notice(`Super category "${name}" already exists.`);
							this.plugin.settings.superCategories[index] = superCategory;
							return;
						}

						await this.plugin.saveSettings();
						this.display();
					});
				})
				.addButton((button) => {
					button.setButtonText("Delete");
					button.onClick(async () => {
						this.plugin.settings.superCategories.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					});
				});
		});
	}

	private renameCategoryInSuperCategories(oldName: string, newName: string) {
		const oldKey = normalizeKey(oldName);
		this.plugin.settings.superCategories = this.plugin.settings.superCategories.map((superCategory) => ({
			...superCategory,
			categories: superCategory.categories.map((categoryName) =>
				normalizeKey(categoryName) === oldKey ? newName : categoryName
			)
		}));
	}
}
