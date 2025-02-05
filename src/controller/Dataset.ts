import { InsightDatasetKind } from "./IInsightFacade";
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

	public toJSON(): object {
		return {
			id: this.id,
			sections: this.sections.map((section) => section.toJSON()),
			kind: this.kind,
		};
	}

	public static fromJSON(json: any): Dataset {
		return new Dataset(
			json.id,
			json.sections.map((sectionJson: any) => Section.fromJSON(sectionJson)),
			json.kind
		);
	}

	public getNumRows(): number {
		return this.sections.length;
	}
}
