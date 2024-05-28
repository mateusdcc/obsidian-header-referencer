import { Category, Header } from "../utils/types";
import HeadRef from "src/main";


interface headerSearch {
    title: string;
    found: boolean;
}

export class ReferenceEngine {
    private categories: Array<Category>;
    private plugin: HeadRef;

    constructor(plugin: HeadRef) {
        this.plugin = plugin;
        this.categories = plugin.settings.categories;
    }
    public async searchReferences(categories?: Array<Category>): Promise<Array<Header>> {
        const headers: Array<Header> = [];
        const category_names = categories?.map((category) => category.name);
        const generalCategoryRegex = new RegExp(`- (.+): (.*)`, 'g');
        const getDescription = new RegExp(`(?<=^[^:]+: ).+$`, 'g');
        if (category_names) {
            const categoryRegex = new RegExp(`- (${category_names.join('|')}): (.*)`, 'g');
            const headerRegex = new RegExp('^#+\\s.*$', 'g'); 
            for (const file of this.plugin.app.vault.getMarkdownFiles()) {
                const fileContent = await this.plugin.app.vault.read(file);
                const headerFound: headerSearch = {
                    title: '',
                    found: false
                }
                for (const line of fileContent
                    .split('\n')
                    .filter((line) => line.trim() !== '')) {
                    if (headerFound.found && line.match(categoryRegex)) {
                        const name = line.match(getDescription);
                        if (name) {
                            let parentName = category_names.find((category) => line.match(new RegExp(`- ${category}:`)));
                            if (!parentName) {
                                parentName = category_names[0];
                            }
                            headers.push({
                                parent: parentName,
                                name: name[0],
                                header: headerFound.title,
                                file: file.path.replace(new RegExp('\\.[^/.]+$'), '')
                            });
                        }
                    } else if (line.match(headerRegex)) {
                        headerFound.found = true;
                        const match = line.match(headerRegex);
                        if (match) {
                            headerFound.title = match[0];
                        }
                    } else if (headerFound.found && !line.match(generalCategoryRegex)) {
                        headerFound.found = false;
                    }
                }
            }
        }
        return headers;
    }
}