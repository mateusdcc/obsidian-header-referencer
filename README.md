# Header Referencer for Obsidian

Header Referencer turns structured header metadata into fast, insertable links for dense math notes.

It is built for notes where each theorem/definition/proof has rich local context under a header.

## Quick Start

1. Open `Settings -> Header Referencer`.
2. Keep defaults or adjust categories and aliases.
3. In your notes, write metadata under headers:

```md
## Compactness Theorem
- Theorem: Every open cover admits a finite subcover.
- Uses: Heine-Borel
- Depends on: Open cover definitions
- Generalizes: Finite subcover in Euclidean spaces
- Proof status: draft
\label{thm:compactness}
```

4. Open command palette and run:
`Header Referencer: List all theorem`
5. Select an item to insert:

```md
[[Analysis/Compactness#Compactness Theorem|Every open cover admits a finite subcover.]]
```

## Metadata Format

Under a markdown header, use bullet metadata:

```md
- Key: Value
```

### Category metadata

Keys matching category names (or aliases) become reference candidates.

Example:

```md
- Definition: A sequence converges if...
```

### Structured metadata

The plugin also reads structured keys (configurable in settings), defaulting to:

- `Uses`
- `Depends on`
- `Generalizes`
- `Label`

### LaTeX labels

LaTeX labels are parsed directly from content:

```tex
\label{thm:compactness}
```

Use command `Header Referencer: List references by LaTeX label` to browse them.

### Proof status

Default proof status key: `Proof status`

Use values like `draft`, `review`, `complete`.
Command `Header Referencer: List proofs to finish` returns incomplete proofs.

## Commands

Commands appear in Obsidian as `Header Referencer: <name>`.

### Core commands

- `All references list`
- `All references list (vault)`
- `All references list (current file)`
- `All references list (current folder)`
- `List references by LaTeX label`
- `List references by LaTeX label (vault)`
- `List references by LaTeX label (current file)`
- `List references by LaTeX label (current folder)`
- `List proofs to finish`
- `List proofs to finish (vault)`
- `List proofs to finish (current file)`
- `List proofs to finish (current folder)`
- `Show prerequisites for current header`
- `Random theorem/definition`
- `Validate header metadata format`

### Dynamic category commands

Every category gets commands automatically.

If category is `Definition`, generated commands include:

- `List all definition`
- `List all definition (vault)`
- `List all definition (current file)`
- `List all definition (current folder)`

Category command generation is refreshed automatically when settings are saved.

### Dynamic super-category commands

Every super category also gets scoped commands.

If super category is `Statements`, generated commands include:

- `Supercategory list statements`
- `Supercategory list statements (vault)`
- `Supercategory list statements (current file)`
- `Supercategory list statements (current folder)`

## Settings Guide

The settings UI is split into intuitive sections:

### Search Behavior

- `Default scope`: used by non-scoped commands (e.g., `List all definition`).
- `Sort mode`: `Category`, `File`, or `Recency`.
- `Group hint`: adds category/file context to modal suggestions.
- `Preview before insert`: show a confirmation modal before link insertion.

### Metadata Keys

- `Structured metadata keys`: comma-separated metadata keys to parse globally.
- `Proof status key`: which metadata key drives proof status commands.

### Categories

- Add/edit/delete categories inline.
- Each category has:
  - Canonical name
  - Aliases (`Def, Def.`, etc.)
- Alias/name conflicts are blocked to prevent ambiguous indexing.
- Renaming a category updates super-category references automatically.

### Super Categories

- Add/edit/delete super categories inline.
- Each super category has:
  - Name
  - Comma-separated category list
- Unknown category names are blocked with validation notices.

## Super Categories (Concept + Example)

A super category groups category keys into one reusable view.

Default examples:

- `Statements` -> `Theorem`, `Lemma`, `Proposition`, `Corollary`
- `Supporting Notes` -> `Definition`, `Notation`, `Remark`, `Example`, `Counterexample`

This is useful when studying by proof-heavy statements vs supporting concepts.

## Math Workflow Suggestions

1. Start each theorem with `Uses`, `Depends on`, and `Generalizes`.
2. Track proof progress with `Proof status: draft/review/complete`.
3. Add LaTeX labels for canonical results (`\label{thm:...}`).
4. Use:
   - `Show prerequisites for current header` while writing proofs.
   - `Random theorem/definition` for active recall.
   - `Validate header metadata format` weekly to clean drift.

## Example Vault Layout

See full sample:
[docs/math-vault-template.md](/Users/mateusdcc/Documents/GitHub/obsidian-header-referencer/docs/math-vault-template.md)

## Validation and Quality

The plugin includes regression tests for:

- Markdown section parsing
- Dynamic command ID generation

Run:

```bash
npm test
```

## Development

```bash
npm install
npm run build
```

If your environment cannot run `tsc`, run `npm test` to still validate parser and command-id behavior.

## Screenshots

![1](https://i.imgur.com/u3uAZgX.png)
![2](https://i.imgur.com/At2U2Zh.png)
![3](https://i.imgur.com/PjzRhsP.png)
![4](https://i.imgur.com/vyazdKE.png)
![5](https://i.imgur.com/CiuceaW.png)
