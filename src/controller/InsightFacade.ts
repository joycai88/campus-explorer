import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import DatasetProcessor from "./DatasetProcessor";
import { Dataset } from "./Dataset";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasetProcessor: DatasetProcessor = new DatasetProcessor(this);
	public datasets: string[];
	public dataMap: Map<string, Dataset>;

	constructor() {
		this.datasets = [];
		this.dataMap = new Map<string, Dataset>();
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (this.dataMap.has(id)) {
			throw new InsightError("Dataset ID already exists");
		}

		try {
			const dataset = await this.datasetProcessor.processDataset(id, content, kind);

			this.dataMap.set(id, dataset);
			this.datasets = Array.from(this.dataMap.keys());

			return this.datasets;
		} catch (err) {
			throw new InsightError(`Failed to add dataset: ${err}`);
		}
	}

	public async removeDataset(id: string): Promise<string> {
		if (!id || id.trim() === "" || id.includes("_")) {
			throw new InsightError("Invalid dataset ID");
		}

		if (!this.dataMap.has(id)) {
			throw new NotFoundError("Dataset not found");
		}

		this.dataMap.delete(id);
		this.datasets = this.datasets.filter((datasetId) => datasetId !== id);

		return id;
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		const datasets: InsightDataset[] = [];

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
