import fs from "fs-extra";
import path from "path";
import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import DatasetProcessor from "./DatasetProcessor";
/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasetProcessor: DatasetProcessor;
	public datasets: Map<string, InsightDataset>;

	constructor(dataDir: string = "./data") {
		this.datasetProcessor = new DatasetProcessor(dataDir);
		this.datasets = new Map();
		this.loadDatasetMetadata();
	}

	private loadDatasetMetadata(): void {
		if (fs.existsSync(this.datasetProcessor.dataDir)) {
			const files = fs.readdirSync(this.datasetProcessor.dataDir);
			for (const file of files) {
				if (file.endsWith(".json")) {
					const id = path.basename(file, ".json");
					const dataset = fs.readJsonSync(path.join(this.datasetProcessor.dataDir, file));
					this.datasets.set(id, { id, kind: dataset.kind, numRows: dataset.sections.length });
				}
			}
		}
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (this.datasets.has(id)) {
			throw new InsightError(`Dataset with id ${id} already exists.`);
		}

		try {
			const dataset = await this.datasetProcessor.processDataset(id, content, kind);
			// console.log(dataset);
			await this.datasetProcessor.saveDatasetToDisk(id, dataset);
			this.datasets.set(id, { id, kind, numRows: dataset.sections.length });

			return Array.from(this.datasets.keys());
		} catch (err) {
			throw new InsightError(`Failed to add dataset: ${err}`);
		}
	}

	public async removeDataset(id: string): Promise<string> {
		if (!id || id.trim() === "" || id.includes("_")) {
			throw new InsightError("Invalid dataset ID");
		}

		if (!this.datasets.has(id)) {
			throw new NotFoundError("Dataset not found");
		}
		await this.datasetProcessor.removeDatasetFromDisk(id);

		this.datasets.delete(id);
		return id;
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		return Array.from(this.datasets.values());
	}
}
