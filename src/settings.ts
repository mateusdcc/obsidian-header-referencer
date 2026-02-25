import { App, Modal, Notice, PluginSettingTab, Setting } from "obsidian";
import HeadRef from "./main";
import { Category, SuperCategory } from "./utils/types";

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

function createCategorySettings(
	containerEl: HTMLElement,
	category: Category,
	index: number,
	plugin: HeadRef,
	renderCategories: () => void
) {
	new Setting(containerEl)
	.setName(category.name)
	.addButton(button => button
		.setButtonText('Delete')
		.onClick(async () => {
			plugin.settings.categories.splice(index, 1);
			await plugin.saveSettings();
			renderCategories();
		})
	);
}

class CreateCategoryModal extends Modal {
	private plugin: HeadRef;
	private categoryName: string;
	private renderCategories: () => void;

	constructor(app: App, plugin: HeadRef, category: Category, renderCategories: () => void) {
		super(app);
		this.plugin = plugin;
		this.categoryName = category.name;
		this.renderCategories = renderCategories;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Create Category' });
		new Setting(contentEl)
			.setName('Category Name')
			.addText(text => text
				.setPlaceholder('Enter the category name')
				.setValue(this.categoryName)
				.onChange((value) => {
					this.categoryName = value;
				})
			);
		const saveButton = contentEl.createEl('button', { text: 'Save' });
		saveButton.addEventListener('click', async () => {
			const name = this.categoryName.trim();
			if (!name) {
				new Notice('Category name cannot be empty.');
				return;
			}

			this.plugin.settings.categories.push({ name });
			await this.plugin.saveSettings();
			this.renderCategories();
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
		containerEl.createEl('h3', { text: 'Created Categories' });
		const editCategories = containerEl.createEl('div');

		const renderCategories = () => {
			editCategories.empty();
			this.plugin.settings.categories.forEach((category, index) => {
				createCategorySettings(editCategories, category, index, this.plugin, renderCategories);
			});
		};

		new Setting(addCategory)
		.setName('Add Category')
		.setDesc('Add a new category')
		.addButton(button => button
			.setButtonText('Add')
			.onClick(async () => {
				const newCategory: Category = {
					name: 'New Category',
				};
				new CreateCategoryModal(this.app, this.plugin, newCategory, renderCategories).open();
			})
		);

		renderCategories();
	}
}
