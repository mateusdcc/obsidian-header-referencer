function buildCommandId(prefix, name, index) {
	const normalized = String(name ?? "")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return `${prefix}-${normalized || "unnamed"}-${index}`;
}

module.exports = {
	buildCommandId
};
