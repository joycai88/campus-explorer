import {InsightDatasetKind} from "./IInsightFacade";
import Section from "./Section";

export class Dataset {
	public id: string;
	public sections: Section[];
	public kind: InsightDatasetKind;

	constructor(id: string, sections: Section[], kind: InsightDatasetKind) {
		this.id = id;
		this.kind = kind;
		this.sections = sections;
	}

	public getNumRows(): number {
		return this.sections.length;
	}
}
