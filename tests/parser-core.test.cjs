const test = require("node:test");
const assert = require("node:assert/strict");
const { parseMarkdownSections } = require("../src/utils/parser-core");

test("parseMarkdownSections parses headers, metadata, and labels", () => {
	const input = [
		"## Theorem (Compactness)",
		"- Theorem: Every open cover has a finite subcover.",
		"- Uses: Heine-Borel",
		"\\label{thm:compactness}",
		"",
		"### Proof sketch",
		"- Proof status: draft",
		"- Depends on: Bolzano-Weierstrass"
	].join("\n");

	const sections = parseMarkdownSections(input);
	assert.equal(sections.length, 2);
	assert.equal(sections[0].header, "Theorem (Compactness)");
	assert.equal(sections[0].entries.length, 2);
	assert.equal(sections[0].labels[0], "thm:compactness");
	assert.equal(sections[1].header, "Proof sketch");
	assert.equal(sections[1].entries[0].key, "Proof status");
	assert.equal(sections[1].entries[0].value, "draft");
});

test("parseMarkdownSections keeps section boundaries by line number", () => {
	const input = [
		"# A",
		"- Definition: One",
		"Some detail",
		"## B",
		"- Definition: Two"
	].join("\n");

	const sections = parseMarkdownSections(input);
	assert.equal(sections[0].headerLine, 1);
	assert.equal(sections[0].endLine, 3);
	assert.equal(sections[1].headerLine, 4);
	assert.equal(sections[1].endLine, 5);
});
