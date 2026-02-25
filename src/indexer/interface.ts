import { App, Editor, FuzzyMatch, FuzzySuggestModal, Modal } from "obsidian";
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
			filePath: header.filePath ?? header.file,
			labels: Array.isArray(header.labels) ? header.labels : [],
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
		const labels = Array.isArray(item.labels) ? item.labels.join(" ") : "";
		return `${item.name} ${item.parent} ${item.filePath} ${item.header} ${labels}`;
	}

	private toHeaderItem(item: TreatedHeader | FuzzyMatch<TreatedHeader>): TreatedHeader {
		const maybeMatch = item as FuzzyMatch<TreatedHeader>;
		const rawItem = (maybeMatch?.item ?? item) as Partial<TreatedHeader>;
		return {
			parent: rawItem.parent ?? "Unknown",
			name: rawItem.name ?? "",
			header: rawItem.header ?? "",
			file: rawItem.file ?? rawItem.filePath ?? "",
			filePath: rawItem.filePath ?? rawItem.file ?? "",
			modifiedTime: rawItem.modifiedTime ?? 0,
			labels: Array.isArray(rawItem.labels) ? rawItem.labels : [],
			metadata: rawItem.metadata ?? {},
			path: rawItem.path ?? ""
		};
	}

	renderSuggestion(item: TreatedHeader | FuzzyMatch<TreatedHeader>, el: HTMLElement): void {
		const headerItem = this.toHeaderItem(item);
		const title = el.createEl("div", { text: headerItem.name });
		title.style.fontWeight = "600";

		const infoParts: string[] = [];
		if (this.options.groupMode === "category") {
			infoParts.push(`[${headerItem.parent}]`);
		}
		if (this.options.groupMode === "file") {
			infoParts.push(`[${headerItem.filePath}]`);
		}
		infoParts.push(`Category: ${headerItem.parent}`);
		infoParts.push(`File: ${headerItem.filePath}`);
		infoParts.push(`Header: ${headerItem.header}`);

		const details = el.createEl("div", { text: infoParts.join(" | ") });
		details.style.fontSize = "0.85em";
		details.style.opacity = "0.8";

		const labelsList = Array.isArray(headerItem.labels) ? headerItem.labels : [];
		if (labelsList.length > 0) {
			const labels = el.createEl("div", { text: `Labels: ${labelsList.join(", ")}` });
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
