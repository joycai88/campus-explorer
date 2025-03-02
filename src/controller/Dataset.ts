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
			items: this.items.map((item) => item.toJSON()),
			kind: this.kind,
		};
	}

	public static fromJSON(json: any): Dataset {
		const { id, kind, items } = json;
		// console.log(json);
		if (!id || !kind || !items) {
			throw new InsightError("Invalid JSON structure for Dataset");
		}

		let convertedItems: DatasetItem[];

		if (kind === InsightDatasetKind.Sections) {
			convertedItems = items.map((sectionJson: any) => Section.fromJSON(sectionJson));
		} else if (kind === InsightDatasetKind.Rooms) {
			convertedItems = items.map((roomJson: any) => Room.fromJSON(roomJson));
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
