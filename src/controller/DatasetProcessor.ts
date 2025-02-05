import path from "path";
import { InsightDatasetKind, InsightError } from "./IInsightFacade";
import Section from "./Section";
import JSZip from "jszip";
import { Dataset } from "./Dataset";
import fs from "fs-extra";

export default class DatasetProcessor {
	private dataDir: string;

	constructor(dataDir: string) {
		this.dataDir = dataDir;
	}

	public async loadFromCache(id: string): Promise<Dataset | null> {
		const cacheFilePath = path.join(this.dataDir, `${id}.txt`);
		if (await fs.pathExists(cacheFilePath)) {
			try {
				const cachedData = await fs.readFile(cacheFilePath, "utf-8");
				return Dataset.fromJSON(JSON.parse(cachedData));
			} catch (err) {
				console.log(`Failed to read cache file for dataset ${id}: ${err}`);
				return null;
			}
		}
		return null;
	}

	public async saveToCache(id: string, dataset: Dataset): Promise<void> {
		const cacheFilePath = path.join(this.dataDir, `${id}.txt`);
		try {
			await fs.writeFile(cacheFilePath, JSON.stringify(dataset.toJSON()));
		} catch (err) {
			console.log(`Failed to save dataset ${id} to cache: ${err}`);
			throw new InsightError(`Failed to cache dataset ${id}`);
		}
	}

	public async removeFromCache(id: string): Promise<void> {
		const cacheFilePath = path.join(this.dataDir, `${id}.txt`);
		if (await fs.pathExists(cacheFilePath)) {
			try {
				await fs.remove(cacheFilePath);
			} catch (err) {
				console.log(`Failed to remove cache file for dataset ${id}: ${err}`);
				throw new InsightError(`Failed to remove dataset ${id} from cache`);
			}
		}
	}

	/**
	 * Processes the dataset by validating, extracting, and converting its content into Section objects.
	 * CITATION: Used AI tool: ChatGPT for help on parseSections method
	 */

	public async processDataset(id: string, content: string, kind: InsightDatasetKind): Promise<Dataset> {
		// Validate the dataset input

		// const cachedDataset = await this.loadFromCache(id);
		// if (cachedDataset) {
		// 	return cachedDataset;
		// }

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
		const dataset = new Dataset(id, sections, kind);
		await this.saveToCache(id, dataset);
		return dataset;
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
