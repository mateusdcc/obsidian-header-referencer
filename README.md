# Header Referencer for Obsidian

Header Referencer indexes metadata-like lines under Markdown headers and lets you insert links to those headers from a command palette picker.

## How it works

Under a header, add lines in this format:

```md
- Category: Description
```

Example:

```md
## Binary Search
- Definition: Search in a sorted list by splitting the interval in half.
- Theorem: Time complexity is O(log n).
```

When you run a command, the plugin scans your vault and shows matching descriptions.  
Choosing one inserts a link like:

```md
[[Algorithms#Binary Search|Search in a sorted list by splitting the interval in half.]]
```

## Commands

The command names appear in Obsidian as `Header Referencer: <command>`.

- `All references list`
- `List all <category>`
- `Supercategory list <super-category>`

### Custom category commands

Custom categories now get commands too.

If you add a category named `Definition`, you will get:

- `Header Referencer: List all definition`

This command is created when category settings are saved.

## Categories

### Default categories

- `General`
- `Theorem`
- `Proposition`
- `Corollary`
- `Lemma`

### Adding custom categories

1. Open `Settings` -> `Header Referencer`.
2. Click `Add` in the category section.
3. Set the category name and save.
4. Run the new generated command in the command palette.

## Super categories

A super category is a named group of categories with its own command.

Default example:

- Super category: `Propositions`
- Includes: `Theorem`, `Proposition`, `Corollary`, `Lemma`
- Command: `Header Referencer: Supercategory list propositions`

### Super category configuration format

Super categories are stored in plugin data under:

- `<vault>/.obsidian/plugins/obsidian-header-referencer/data.json`

Shape:

```json
{
  "superCategories": [
    {
      "name": "Propositions",
      "categories": [
        { "name": "Theorem" },
        { "name": "Proposition" },
        { "name": "Corollary" },
        { "name": "Lemma" }
      ]
    }
  ]
}
```

If you edit `data.json` manually, reload the plugin (or restart Obsidian) so commands are rebuilt from the updated values.

## Screenshots

![1](https://i.imgur.com/u3uAZgX.png)
![2](https://i.imgur.com/At2U2Zh.png)
![3](https://i.imgur.com/PjzRhsP.png)
![4](https://i.imgur.com/vyazdKE.png)
![5](https://i.imgur.com/CiuceaW.png)
