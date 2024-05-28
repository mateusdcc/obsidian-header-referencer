import { App, Editor, FuzzySuggestModal, Modal } from "obsidian";
import HeadRef from "src/main";
import { Header } from "src/utils/types";


interface treatedHeader extends Header {
    path: string;
}

export class ResultModal extends FuzzySuggestModal<treatedHeader> {
    private plugin: HeadRef;
    private headers: Array<treatedHeader>;
    private editor: Editor;

    constructor(app: App, plugin: HeadRef, headers: Array<Header>, editor: Editor) {
        super(app);
        this.plugin = plugin;
        this.headers = headers.map((header) => {
            return {
                ...header,
                path: `[[${header.file}#${header.header.replace(/^#+\s/, '')}|${header.name}]]`,
            }
        })
        this.editor = editor;
    }

    getItems(): treatedHeader[] {
        return this.headers;
    }

    getItemText(item: treatedHeader): string {
        return item.name;
    }

    onChooseItem(item: treatedHeader, evt: MouseEvent | KeyboardEvent): void {
        this.editor.replaceSelection(item.path);
        this.close();
    }
}