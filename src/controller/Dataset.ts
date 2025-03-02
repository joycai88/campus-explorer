import { InsightDatasetKind, InsightError } from "./IInsightFacade";
import Section from "./Section";
import Room from "./Room";

type DatasetItem = Section | Room;

export class Dataset {
	public id: string;
	public items: DatasetItem[];
	public kind: InsightDatasetKind;

	constructor(id: string, items: DatasetItem[], kind: InsightDatasetKind) {
		this.id = id;
		this.kind = kind;
		this.items = items;
	}

	public toJSON(): object {
		return {
			id: this.id,
			sections: this.items.map((section) => section.toJSON()),
			kind: this.kind,
		};
	}

	public static fromJSON(json: any): Dataset {
		const { id, kind, items } = json;

		// Convert the items based on the dataset kind
		let convertedItems: DatasetItem[];
		if (kind === InsightDatasetKind.Sections) {
			convertedItems = items.map((itemJson: any) => Section.fromJSON(itemJson));
		} else if (kind === InsightDatasetKind.Rooms) {
			convertedItems = items.map((itemJson: any) => Room.fromJSON(itemJson));
		} else {
			throw new InsightError(`Unknown dataset kind: ${kind}`);
		}

		return new Dataset(id, convertedItems, kind);
	}

	public getNumRows(): number {
		return this.items.length;
	}

	public getSections(): Section[] {
		if (this.kind !== InsightDatasetKind.Sections) {
			throw new Error("This dataset does not contain sections");
		}
		return this.items as Section[];
	}

	public getRooms(): Room[] {
		if (this.kind !== InsightDatasetKind.Rooms) {
			throw new Error("This dataset does not contain rooms");
		}
		return this.items as Room[];
	}
}
