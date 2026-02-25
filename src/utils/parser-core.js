const HEADING_REGEX = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
const METADATA_REGEX = /^\s*-\s*([^:]+?)\s*:\s*(.*)\s*$/;
const LABEL_REGEX = /\\label\{([^}]+)\}/g;

function extractLabels(line) {
	const labels = [];
	LABEL_REGEX.lastIndex = 0;
	let match = LABEL_REGEX.exec(line);
	while (match) {
		const label = match[1].trim();
		if (label) {
			labels.push(label);
		}
		match = LABEL_REGEX.exec(line);
	}
	return labels;
}

function parseMarkdownSections(content) {
	const lines = content.split(/\r?\n/);
	const sections = [];
	let currentSection = null;

	lines.forEach((line, index) => {
		const lineNumber = index + 1;
		const headingMatch = line.match(HEADING_REGEX);
		if (headingMatch) {
			if (currentSection) {
				currentSection.endLine = lineNumber - 1;
				sections.push(currentSection);
			}

			currentSection = {
				header: headingMatch[2].trim(),
				headerLine: lineNumber,
				endLine: lineNumber,
				entries: [],
				labels: []
			};
			return;
		}

		if (!currentSection) {
			return;
		}

		const metadataMatch = line.match(METADATA_REGEX);
		if (metadataMatch) {
			currentSection.entries.push({
				key: metadataMatch[1].trim(),
				value: metadataMatch[2].trim(),
				line: lineNumber
			});
		}

		extractLabels(line).forEach((label) => {
			if (!currentSection.labels.includes(label)) {
				currentSection.labels.push(label);
			}
		});
	});

	if (currentSection) {
		currentSection.endLine = lines.length;
		sections.push(currentSection);
	}

	return sections;
}

module.exports = {
	HEADING_REGEX,
	METADATA_REGEX,
	LABEL_REGEX,
	parseMarkdownSections
};
