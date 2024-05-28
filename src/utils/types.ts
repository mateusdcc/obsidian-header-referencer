export interface Header {
    parent: string;
    name: string;
    header: string;
    file: string;
}

export interface Category {
    name: string;
}

export interface SuperCategory {
    name: string;
    categories: Array<Category>;
}