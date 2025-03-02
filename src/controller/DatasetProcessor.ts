import path from "path";
import { InsightDatasetKind, InsightError } from "./IInsightFacade";
import JSZip from "jszip";
import { Dataset } from "./Dataset";
import fs from "fs-extra";
import HTMLProcessor from "./HTMLProcessor";
import JSONProcessor from "./JSONProcessor";

export default class DatasetProcessor {
	private dataDir: string;
	private htmlProcessor: HTMLProcessor;
	private jsonProcessor: JSONProcessor;

	constructor(dataDir: string) {
		this.dataDir = dataDir;
		this.htmlProcessor = new HTMLProcessor();
		this.jsonProcessor = new JSONProcessor();
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

	public async processDataset(id: string, content: string, kind: InsightDatasetKind): Promise<Dataset> {
		// Try to load from cache first
		const cachedDataset = await this.loadFromCache(id);
		if (cachedDataset) {
			return cachedDataset;
		}

		// Validate and process the dataset
		await this.validateDataset(id, content, kind);
		const zip = await JSZip.loadAsync(content, { base64: true });

		let dataset: Dataset;
		if (kind === InsightDatasetKind.Sections) {
			dataset = await this.processSectionsDataset(id, zip);
		} else if (kind === InsightDatasetKind.Rooms) {
			dataset = await this.processRoomsDataset(id, zip);
		} else {
			throw new InsightError("Unsupported dataset kind");
		}

		// Save to cache and return
		await this.saveToCache(id, dataset);
		return dataset;
	}

	private async processSectionsDataset(id: string, zip: JSZip): Promise<Dataset> {
		// Validate and extract the courses folder
		const root = Object.keys(zip.files);
		if (root[0] !== "courses/") {
			throw new InsightError("Folder not named /courses");
		}

		const coursesFolder = zip.folder("courses");
		if (!coursesFolder) {
			throw new InsightError("No courses folder found in the dataset.");
		}

		// Process JSON files
		const coursePromises: Promise<string>[] = [];
		coursesFolder.forEach((relativePath, file) => {
			coursePromises.push(file.async("text"));
		});

		const rawCourses: string[] = await Promise.all(coursePromises);
		const sections = this.jsonProcessor.parseSections(rawCourses);

		// Ensure at least one valid section was added
		if (sections.length === 0) {
			throw new InsightError("No valid sections to add.");
		}

		return new Dataset(id, sections, InsightDatasetKind.Sections);
	}

	private async processRoomsDataset(id: string, zip: JSZip): Promise<Dataset> {
		const indexFile = zip.file("index.htm");
		if (!indexFile) {
			throw new InsightError("Missing index.htm file");
		}

		const indexContent = await indexFile.async("text");
		const rooms = await this.htmlProcessor.processRoomsData(indexContent, zip);

		if (rooms.length === 0) {
			throw new InsightError("No valid rooms found in dataset");
		}

		return new Dataset(id, rooms, InsightDatasetKind.Rooms);
	}

	// Helper function to validate id and content
	private async validateDataset(id: string, content: string, kind: InsightDatasetKind): Promise<void> {
		// Check ID validity
		if (id === null || !id || id.trim() === "" || id.includes("_")) {
			throw new InsightError("Invalid dataset ID");
		}

		if (content === null) {
			throw new InsightError("Null content");
		}

		// Validate base64 content
		try {
			this.decodeBase64(content);
		} catch {
			throw new InsightError("Invalid base64 content");
		}
	}

	private decodeBase64(content: string): Buffer {
		return Buffer.from(content, "base64");
	}
}
