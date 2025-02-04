import fs from "fs-extra";
import { InsightDatasetKind, InsightError } from "./IInsightFacade";
import Section from "./Section";
import JSZip from "jszip";
import { Dataset } from "./Dataset";
import path from "path";

export default class DatasetProcessor {
	public dataDir: string;

	constructor(dataDir: string = "./data") {
		this.dataDir = dataDir;
		this.checkDataDir();
	}

	/**
	 * Ensures proper caching of datasets
	 * CITATION: Used AI tool: ChatGPT for help on some caching helper methods
	 */

	private checkDataDir(): void {
		if (!fs.existsSync(this.dataDir)) {
			fs.mkdirSync(this.dataDir, { recursive: true });
		}
	}

	private getDatasetFilePath(id: string): string {
		return path.join(this.dataDir, `${id}.json`);
	}

	public async saveDatasetToDisk(id: string, dataset: Dataset): Promise<void> {
		const filePath = this.getDatasetFilePath(id);
		await fs.writeJson(filePath, dataset);
	}

	public async loadDatasetFromDisk(id: string): Promise<Dataset | null> {
		const filePath = this.getDatasetFilePath(id);
		if (await fs.pathExists(filePath)) {
			return await fs.readJson(filePath);
		}
		return null;
	}

	public async removeDatasetFromDisk(id: string): Promise<void> {
		const filePath = this.getDatasetFilePath(id);
		if (await fs.pathExists(filePath)) {
			await fs.remove(filePath);
		}
	}

	/**
	 * Processes the dataset by validating, extracting, and converting its content into Section objects.
	 * CITATION: Used AI tool: ChatGPT for help on parseSections method
	 */

	public async processDataset(id: string, content: string, kind: InsightDatasetKind): Promise<Dataset> {
		// Validate the dataset input
		const cachedDataset = await this.loadDatasetFromDisk(id);
		if (cachedDataset) {
			return cachedDataset;
		}

		await this.validateDataset(id, content, kind);

		// Decode and extract the dataset content
		const zip = await JSZip.loadAsync(content, { base64: true });
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
