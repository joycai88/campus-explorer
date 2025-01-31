import { InsightDatasetKind, InsightError } from "./IInsightFacade";
import Section from "./Section";
import JSZip from "jszip";
import InsightFacade from "./InsightFacade";
import {Dataset} from "./Dataset";

export default class DatasetProcessor {
	private insightFacade: InsightFacade;

	constructor(insightFacade: InsightFacade) {
		this.insightFacade = insightFacade;
	}

	/**
	 * Processes the dataset by validating, extracting, and converting its content into Section objects.
	 */


	public async processDataset(id: string, content: string, kind: InsightDatasetKind): Promise<Dataset> {
		// Validate the dataset input
		await this.validateDataset(id, content, kind);

		// Decode and extract the dataset content
		const zip = await JSZip.loadAsync(content, {base64:true});
		const root = Object.keys(zip.files);
		if (root[0] !== "courses/") {
			throw new InsightError("Folder not named /courses");
		}
		const coursesFolder = zip.folder("courses");
		if (!coursesFolder) {
			throw new InsightError("No courses folder found in the dataset.");
		}
		const coursePromises: Promise<string>[] = [];
		coursesFolder.forEach((relativePath, file) => {
			coursePromises.push(file.async("text"));
		});
		const rawCourses: string[] = await Promise.all(coursePromises);
		const sections = this.parseSections(rawCourses);

		// Ensure at least one valid course was added
		if (sections.length === 0) {
			throw new InsightError("No valid sections to add.");
		}
		return new Dataset(id, sections, kind);
	}

	// Helper function to validate id, kind, content
	private async validateDataset(id: string, content: string, kind: InsightDatasetKind): Promise<void> {
		// Check ID validity
		if (!id || id.trim() === "" || id.includes("_")) {
			throw new InsightError("Invalid dataset ID");
		}

		// Check for duplicate ID
		if (kind !== InsightDatasetKind.Sections) {
			throw new InsightError("Invalid dataset kind");
		}

		// Validate base64 content
		try {
			this.decodeBase64(content);
		} catch {
			throw new InsightError("Invalid base64 content");
		}
	}

	// Helper function to parse course into sections, return sections
	private parseSections(rawCourses: string[]): Section[] {
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

	private decodeBase64(content: string): Buffer {
		return Buffer.from(content, "base64");
	}



	// Convert JSON into Section class
	private convertToSection(item: any): Section {
		const requiredKeys = [
			"id",
			"Course",
			"Title",
			"Professor",
			"Subject",
			"Year",
			"Avg",
			"Pass",
			"Fail",
			"Audit",
		];

		// Throw error if missing required key
		for (const key of requiredKeys) {
			if (!(key in item)) {
				throw new InsightError(`Missing required property ${key} in item`);
			}
		}

		return new Section(
			item.uuid,
			item.id,
			item.title,
			item.instructor,
			item.dept,
			item.year,
			item.avg,
			item.pass,
			item.fail,
			item.audit
		);
	}
}
