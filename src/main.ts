import { Editor, Plugin } from 'obsidian';
import { ResultModal } from './indexer/interface';
import { ReferenceEngine } from './indexer/indexer';
import { DEFAULT_SETTINGS, PluginSettingTabImpl, PluginSettings } from './settings';
import { Category, SuperCategory } from './utils/types';

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
		this.addCommand({
			id: 'search-references',
			name: 'All references list',
			editorCallback: async (editor: Editor) => {
				await this.openResults(editor, this.settings.categories);
			}
		});
	}

	private addCategoryCommand(category: Category, index: number) {
		const id = this.buildCommandId('search-category', category.name, index);
		this.dynamicCommandIds.push(id);
		this.addCommand({
			id,
			name: `List all ${category.name.toLowerCase()}`,
			editorCallback: async (editor: Editor) => {
				await this.openResults(editor, [category]);
			}
		});
	}

	private addSuperCategoryCommand(superCategory: SuperCategory, index: number) {
		const id = this.buildCommandId('search-super-category', superCategory.name, index);
		this.dynamicCommandIds.push(id);
		this.addCommand({
			id,
			name: `Supercategory list ${superCategory.name.toLowerCase()}`,
			editorCallback: async (editor: Editor) => {
				await this.openResults(editor, superCategory.categories);
			}
		});
	}

	private buildCommandId(prefix: string, name: string, index: number): string {
		const normalized = name
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');

		return `${prefix}-${normalized || 'unnamed'}-${index}`;
	}

	private async openResults(editor: Editor, categories: Category[]) {
		const engine = new ReferenceEngine(this);
		const headers = await engine.searchReferences(categories);
		new ResultModal(this.app, this, headers, editor).open();
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
		let settings = await this.loadData();

		if (!settings) {
			settings = DEFAULT_SETTINGS(this);
		}

		this.settings = settings;
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.refreshDynamicCommands();
	}
}
