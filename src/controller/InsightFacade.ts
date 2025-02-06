import fs from "fs-extra";
//import path from "path";
import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import DatasetProcessor from "./DatasetProcessor";
import QueryEngine from "./QueryEngine";

import { Dataset } from "./Dataset";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasetProcessor: DatasetProcessor;
	public datasets: string[];
	public dataMap: Map<string, Dataset>;
	public dataDir;

	private queryEngine: QueryEngine = new QueryEngine(this);

	constructor(dataDir: string = "./data") {
		this.datasetProcessor = new DatasetProcessor(dataDir);
		this.dataDir = dataDir;
		this.datasets = [];
		this.dataMap = new Map<string, Dataset>();

		// this.syncCache().catch((err) => {
		// 	console.error(`Failed to synchronize cache: ${err}`);
		//
		// });
	}

	private async syncCache(): Promise<void> {
		try {
			await fs.ensureDir(this.dataDir);

			const files = await fs.readdir(this.dataDir);

			// Process all files concurrently
			await Promise.all(
				files.map(async (file) => {
					if (file.endsWith(".txt")) {
						const id = file.replace(".txt", "");
						try {
							const dataset = await this.datasetProcessor.loadFromCache(id);
							if (dataset) {
								this.dataMap.set(id, dataset);
								this.datasets.push(id);
							}
						} catch (err) {
							console.error(`Failed to load dataset ${id} from cache: ${err}`);
						}
					}
				})
			);
		} catch (err) {
			console.error(`Failed to synchronize cache: ${err}`);
		}
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// Wait for cache to sync
		await this.syncCache();

		if (this.dataMap.has(id)) {
			throw new InsightError("Dataset ID already exists");
		}

		try {
			const dataset = await this.datasetProcessor.processDataset(id, content, kind);
			// console.log(dataset)
			// console.log(dataset);
			this.dataMap.set(id, dataset);
			this.datasets = Array.from(this.dataMap.keys());

			await this.datasetProcessor.saveToCache(id, dataset);
			return this.datasets;
		} catch (err) {
			throw new InsightError(`Failed to add dataset: ${err}`);
		}
	}

	public async removeDataset(id: string): Promise<string> {
		if (!id || id.trim() === "" || id.includes("_")) {
			throw new InsightError("Invalid dataset ID");
		}
		// Wait for cache to sync before looking for ids in dataMap
		await this.syncCache();

		if (!this.dataMap.has(id)) {
			throw new NotFoundError("Dataset not found");
		}

		this.dataMap.delete(id);
		this.datasets = this.datasets.filter((datasetId) => datasetId !== id);

		await this.datasetProcessor.removeFromCache(id);

		return id;
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		//check that query is a JSON
		if (typeof query !== "object" || query === null) {
			throw new InsightError("Invalid query string");
		}
		const jsonQuery: any = query;
		//handleOPTIONS sets up results
		this.queryEngine.handleOPTIONS(jsonQuery.OPTIONS);
		//filters results based on user inputs
		let result: InsightResult[] = [];
		try {
			result = this.queryEngine.handleWHERE(jsonQuery.WHERE);
		} catch (err) {
			throw err;
		} finally {
			this.queryEngine.cleanUp();
		}

		//check that size of results no bigger than 5000
		const maxSize = 5000;
		if (result.length > maxSize) {
			throw new ResultTooLargeError(
				"The result is too big. Only queries with a maximum " + "of 5000 results are supported."
			);
		}
		return result;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		const datasets: InsightDataset[] = [];

		// Wait for cache to sync
		await this.syncCache();

		for (const [id, dataset] of this.dataMap.entries()) {
			datasets.push({
				id,
				kind: dataset.kind,
				numRows: dataset.getNumRows(),
			});
		}

		return datasets;
	}
}
