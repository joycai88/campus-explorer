import Section from "./Section";
import {InsightError} from "./IInsightFacade";

export default class JSONProcessor {
	/**
	 * Parse JSON sections from raw course data
	 * CITATION: Used AI tool: ChatGPT for help on parseSections method
	 */
	public parseSections(rawCourses: string[]): Section[] {
		const sections: Section[] = [];

		for (const rawCourse of rawCourses) {
			try {
				const parsedContent = JSON.parse(rawCourse);
				if (Array.isArray(parsedContent.result) && parsedContent.result.length > 0) {
					for (const item of parsedContent.result) {
						try {
							const section = this.convertToSection(item);
							sections.push(section);
						} catch (err) {
							console.warn("Skipping invalid section:", err);
						}
					}
				}
			} catch (err) {
				console.warn("Skipping invalid JSON file:", err);
			}
		}

		return sections;
	}

	// Convert JSON into Section class
	private convertToSection(item: any): Section {
		const requiredKeys = [
			"Title",
			"Section",
			"id",
			"Professor",
			"Audit",
			"Year",
			"Course",
			"Pass",
			"Fail",
			"Avg",
			"Subject",
		];

		// Throw error if missing required key
		for (const key of requiredKeys) {
			if (!(key in item)) {
				throw new InsightError(`Missing required property ${key} in item`);
			}
		}

		// Convert Year to 1900 if Section is overall
		if (item.Section.toLowerCase() === "overall") {
			item.Year = 1900;
		}

		return new Section(
			item.id,
			item.Course,
			item.Title,
			item.Professor,
			item.Subject,
			item.Year,
			item.Avg,
			item.Pass,
			item.Fail,
			item.Audit
		);
	}
}
