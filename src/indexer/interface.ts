import { App, Editor, FuzzySuggestModal, Modal } from "obsidian";
import { GroupMode, Header } from "src/utils/types";

interface TreatedHeader extends Header {
	path: string;
}

interface ResultModalOptions {
	groupMode: GroupMode;
	previewBeforeInsert: boolean;
}

class InsertPreviewModal extends Modal {
	private item: TreatedHeader;
	private onConfirm: (item: TreatedHeader) => void;

	constructor(app: App, item: TreatedHeader, onConfirm: (item: TreatedHeader) => void) {
		super(app);
		this.item = item;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Insert Header Reference" });
		contentEl.createEl("p", { text: `Description: ${this.item.name}` });
		contentEl.createEl("p", { text: `Category: ${this.item.parent}` });
		contentEl.createEl("p", { text: `File: ${this.item.filePath}` });
		contentEl.createEl("p", { text: `Header: ${this.item.header}` });
		contentEl.createEl("code", { text: this.item.path });

		const actions = contentEl.createEl("div");
		const insertButton = actions.createEl("button", { text: "Insert" });
		insertButton.addEventListener("click", () => {
			this.onConfirm(this.item);
			this.close();
		});

		const cancelButton = actions.createEl("button", { text: "Cancel" });
		cancelButton.addEventListener("click", () => {
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class InfoListModal extends Modal {
	private title: string;
	private subtitle?: string;
	private items: string[];

	constructor(app: App, title: string, items: string[], subtitle?: string) {
		super(app);
		this.title = title;
		this.items = items;
		this.subtitle = subtitle;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: this.title });
		if (this.subtitle) {
			contentEl.createEl("p", { text: this.subtitle });
		}

		if (this.items.length === 0) {
			contentEl.createEl("p", { text: "No items found." });
			return;
		}

		const list = contentEl.createEl("ul");
		this.items.forEach((item) => {
			list.createEl("li", { text: item });
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class ResultModal extends FuzzySuggestModal<TreatedHeader> {
	private headers: TreatedHeader[];
	private editor: Editor;
	private options: ResultModalOptions;

	constructor(app: App, headers: Header[], editor: Editor, options: ResultModalOptions) {
		super(app);
		this.headers = headers.map((header) => ({
			...header,
			path: `[[${header.file}#${header.header}|${header.name}]]`
		}));
		this.editor = editor;
		this.options = options;

		this.setPlaceholder("Search references...");
	}

	getItems(): TreatedHeader[] {
		return this.headers;
	}

	getItemText(item: TreatedHeader): string {
		const labels = item.labels.join(" ");
		return `${item.name} ${item.parent} ${item.filePath} ${item.header} ${labels}`;
	}

	renderSuggestion(item: TreatedHeader, el: HTMLElement): void {
		const title = el.createEl("div", { text: item.name });
		title.style.fontWeight = "600";

		const infoParts: string[] = [];
		if (this.options.groupMode === "category") {
			infoParts.push(`[${item.parent}]`);
		}
		if (this.options.groupMode === "file") {
			infoParts.push(`[${item.filePath}]`);
		}
		infoParts.push(`Category: ${item.parent}`);
		infoParts.push(`File: ${item.filePath}`);
		infoParts.push(`Header: ${item.header}`);

		const details = el.createEl("div", { text: infoParts.join(" | ") });
		details.style.fontSize = "0.85em";
		details.style.opacity = "0.8";

		if (item.labels.length > 0) {
			const labels = el.createEl("div", { text: `Labels: ${item.labels.join(", ")}` });
			labels.style.fontSize = "0.8em";
			labels.style.opacity = "0.7";
		}
	}

	onChooseItem(item: TreatedHeader): void {
		const insertLink = (selected: TreatedHeader) => {
			this.editor.replaceSelection(selected.path);
		};

		if (this.options.previewBeforeInsert) {
			this.close();
			new InsertPreviewModal(this.app, item, insertLink).open();
			return;
		}

		insertLink(item);
		this.close();
	}
}
