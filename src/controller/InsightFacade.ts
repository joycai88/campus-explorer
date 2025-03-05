import fs from "fs-extra";
//import path from "path";
import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import DatasetProcessor from "./DatasetProcessor";
import QueryEngine from "./QueryEngine";

import { Dataset } from "./Dataset";
import { QueryValidator } from "./QueryValidator";
import QueryTransformer from "./QueryTransformer";

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
	private queryTransformer: QueryTransformer = new QueryTransformer();

	constructor(dataDir: string = "./data") {
		this.datasetProcessor = new DatasetProcessor(dataDir);
		this.dataDir = dataDir;
		this.datasets = [];
		this.dataMap = new Map<string, Dataset>();

		this.syncCache().catch((err) => {
			console.error(`Failed to synchronize cache: ${err}`);
		});
	}

	// CITATION: Used ChatGPT for syncCache()
	private async syncCache(): Promise<void> {
		try {
			await fs.ensureDir(this.dataDir);
			const files = await fs.readdir(this.dataDir);

			const loadedDatasets = new Set<string>();

			const loadPromises = files
				.filter((file) => file.endsWith(".txt"))
				.map(async (file) => {
					const id = file.replace(".txt", "");
					try {
						const dataset = await this.datasetProcessor.loadFromCache(id);
						if (dataset) {
							// Prevent duplicate additions
							if (!loadedDatasets.has(id)) {
								this.dataMap.set(id, dataset);
								loadedDatasets.add(id);
							}
						}
					} catch (err) {
						console.error(`Failed to load dataset ${id} from cache: ${err}`);
						try {
							await this.datasetProcessor.removeFromCache(id);
						} catch (removeErr) {
							console.error(`Failed to remove corrupted cache file ${id}: ${removeErr}`);
						}
					}
				});

			await Promise.all(loadPromises);

			this.datasets = Array.from(this.dataMap.keys());
		} catch (err) {
			console.error(`Critical cache synchronization failure: ${err}`);
			this.dataMap.clear();
			this.datasets = [];
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
		await this.datasetProcessor.removeFromCache(id);

		this.dataMap.delete(id);
		this.datasets = Array.from(this.dataMap.keys());

		return id;
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		//check that query is a JSON
		if (typeof query !== "object" || query === null) {
			throw new InsightError("Invalid query string");
		}
		const jsonQuery: any = query;
		const queryValidator = new QueryValidator(this);
		let datasetID = null;
		try {
			datasetID = queryValidator.validateQuery(jsonQuery);
		} catch (err) {
			throw err;
		}

		//handleOPTIONS sets up results
		this.queryEngine.handleOPTIONS(jsonQuery.OPTIONS, datasetID);

		//filters results based on user inputs
		let result: InsightResult[] = [];
		try {
			const hasTransform: boolean = !!jsonQuery.TRANSFORMATIONS;
			result = this.queryEngine.handleWHERE(jsonQuery.WHERE, hasTransform);
			if (hasTransform) {
				result = this.queryTransformer.handleTRANSFORM(result, jsonQuery);
			}
		} catch (err) {
			throw err;
		} finally {
			this.queryEngine.cleanUp();
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
