import { ReferenceEngine } from './indexer/indexer';
import { ResultModal } from './indexer/interface';
import { PluginSettings, DEFAULT_SETTINGS, PluginSettingTabImpl } from './settings';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

export default class HeadRef extends Plugin {
	settings!: PluginSettings;

	async onload() {
		await this.loadSettings();
		this.settings.categories.forEach((category) => {
			this.addCommand({
				id: `search-${category.name}`,
				name: `List all ${category.name.toLowerCase()}`,
				editorCallback: async (editor: Editor, view: MarkdownView) => {
					const engine = new ReferenceEngine(this);
					const headers = await engine.searchReferences([category]);
					new ResultModal(this.app, this, headers, editor).open();
				}
			});
		});
		
		this.addCommand({
			id: 'search-references',
			name: 'All references list',
			editorCallback: async (editor: Editor) => {
				const engine = new ReferenceEngine(this);
				const headers = await engine.searchReferences(this.settings.categories);
				new ResultModal(this.app, this, headers, editor).open();
			}
		});
		this.addSettingTab(new PluginSettingTabImpl(this.app, this));

		this.settings.superCategories.forEach((superCategory) => {
			this.addCommand({
				id: `search-${superCategory.name}`,
				name: `Supercategory list ${superCategory.name.toLowerCase()}`,
				editorCallback: async (editor: Editor, view: MarkdownView) => {
					const engine = new ReferenceEngine(this);
					const headers = await engine.searchReferences(superCategory.categories);
					new ResultModal(this.app, this, headers, editor).open();
				}
			});
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
	}
}