const test = require("node:test");
const assert = require("node:assert/strict");
const { buildCommandId } = require("../src/utils/command-core");

test("buildCommandId sanitizes names", () => {
	assert.equal(buildCommandId("search-category", "Definition", 0), "search-category-definition-0");
	assert.equal(buildCommandId("search-category", "  Proof Status  ", 1), "search-category-proof-status-1");
	assert.equal(buildCommandId("search-category", "Lemma/Corollary", 2), "search-category-lemma-corollary-2");
});

test("buildCommandId includes index to avoid collisions", () => {
	const a = buildCommandId("search-category", "Definition", 0);
	const b = buildCommandId("search-category", "Definition", 1);
	assert.notEqual(a, b);
});

test("buildCommandId falls back to unnamed", () => {
	assert.equal(buildCommandId("search-category", "   ", 5), "search-category-unnamed-5");
});
