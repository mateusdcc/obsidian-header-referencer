import { PluginSettingTab, App, Setting, ColorComponent, Modal } from "obsidian";
import HeadRef from "./main";
import { Category, Header, SuperCategory } from "./utils/types";
import { stringify } from "querystring";
import { create } from "domain";

export interface PluginSettings {
	version: string;
	categories: Array<Category>;
	superCategories: Array<SuperCategory>;
}

const DEFAULT_SETTINGS_STATIC: Omit<PluginSettings, "version"> = {
	categories: [
		{
			name: "General",
		},
		{
			name: "Theorem",
		},
		{
			name: "Proposition",
		},
		{
			name: "Corollary",
		},
		{
			name: "Lemma",
		},
	],
	superCategories: [{
		name: "Propositions",
		categories: [
			{
				name: "Theorem"
			},
			{
				name: "Proposition"
			},
			{
				name: "Corollary"
			},
			{
				name: "Lemma"
			}
		]
	}],
};

export function DEFAULT_SETTINGS(plugin: HeadRef): PluginSettings {
	return {
		version: plugin.manifest.version,
		...DEFAULT_SETTINGS_STATIC
	}
}

function createCategorySettings(containerEl: HTMLElement, category: Category, index: number, plugin: HeadRef) {
	new Setting(containerEl)
	.setName(category.name)
	.addButton(button => button
		.setButtonText('Delete')
		.onClick(async () => {
			plugin.settings.categories.splice(index, 1);
			await plugin.saveSettings();
			plugin.loadSettings();
			containerEl.empty();
			plugin.settings.categories.forEach((category, index) => {
				createCategorySettings(containerEl, category, index, plugin);
			});
		})
	);
}

class CreateCategoryModal extends Modal {
	private plugin: HeadRef;
	private category: Category;
	private componentEl: HTMLElement;

	constructor(app: App, plugin: HeadRef, category: Category, componentEl: HTMLElement) {
		super(app);
		this.plugin = plugin;
		this.category = category;
		this.componentEl = componentEl;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Create Category' });
		new Setting(contentEl)
			.setName('Category Name')
			.addText(text => text
				.setPlaceholder('Enter the category name')
				.setValue(this.category.name)
				.onChange(async (value) => {
					this.category.name = value;
				})
			);
		const saveButton = contentEl.createEl('button', { text: 'Save' });
		saveButton.addEventListener('click', async () => {
			this.plugin.settings.categories.push(this.category);
			await this.plugin.saveSettings();
			this.plugin.loadSettings();
			createCategorySettings(this.componentEl, this.category, this.plugin.settings.categories.length - 1, this.plugin);
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
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
		containerEl.createEl('h1', { text: 'Settings for Head Referencer' });

		containerEl.createEl('h4', { text: 'Categories' });
		const addCategory = containerEl.createEl('div', { cls: 'ohr-add-category' });
		new Setting(addCategory)
		.setName('Add Category')
		.setDesc('Add a new category')
		.addButton(button => button
			.setButtonText('Add')
			.onClick(async () => {
				const newCategory: Category = {
					name: 'New Category',
				};
				this.plugin.settings.categories.push(newCategory);
				await this.plugin.saveSettings();
				this.plugin.loadSettings();
				new CreateCategoryModal(this.app, this.plugin, newCategory, editCategories).open();
			})
		);

		containerEl.createEl('h3', { text: 'Created Categories' });
		const editCategories = containerEl.createEl('div');

		this.plugin.settings.categories.forEach((category, index) => {
			createCategorySettings(editCategories, category, index, this.plugin);
		}
		);
		
	}
}