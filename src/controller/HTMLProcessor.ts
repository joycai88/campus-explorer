import * as parse5 from "parse5";
import Room from "./Room";
import JSZip from "jszip";
import { InsightError } from "./IInsightFacade";

// CITATION: Used Claude AI as an aid

export default class HTMLProcessor {
	public async processRoomsData(indexContent: string, zip: JSZip): Promise<Room[]> {
		const isValidStructure = await this.validateFileStructure(zip);
		if (!isValidStructure) {
			throw new InsightError("Invalid file structure in dataset");
		}

		const indexDocument = parse5.parse(indexContent);
		const buildingTable = this.findTable(indexDocument);

		if (!buildingTable) throw new InsightError("No valid building table in index.htm");

		const buildings = await this.extractBuildingsFromIndex(buildingTable);

		const buildingPromises = buildings.map(async (building) => {
			const buildingFile = zip.file(this.normalizePath(building.href));

			if (!buildingFile) return [];

			try {
				const buildingContent = await buildingFile.async("text");
				const buildingDocument = parse5.parse(buildingContent);
				return this.processBuilding(buildingDocument, building);
			} catch (err) {
				console.warn(`Failed to process building ${building.shortname}: ${err}`);
				return [];
			}
		});

		const rooms = await Promise.all(buildingPromises);

		return rooms.flat();
	}

	public async validateFileStructure(zip: JSZip): Promise<boolean> {
		const indexFile = zip.file("index.htm");
		if (!indexFile) return false;

		const expectedPath = "campus/discover/buildings-and-classrooms/";
		const files = Object.keys(zip.files);

		return files.some((file) => file.startsWith(expectedPath) && file.endsWith(".htm") && file !== expectedPath);
	}

	private findTable(document: any): any {
		const tables = this.findElements(document, "table");

		for (const table of tables) {
			const cells = this.findElements(table, "td");
			for (const cell of cells) {
				if (this.hasValidClass(cell)) {
					return table;
				}
			}
		}
		return null;
	}

	private hasValidClass(element: any): boolean {
		const classAttribute = this.getAttributeValue(element, "class");

		if (classAttribute === null || classAttribute === undefined) {
			return false;
		}

		const validClasses = [
			"views-field",
			"views-field-field-building-image",
			"views-field-field-building-code",
			"views-field-title",
			"views-field-field-building-address",
			"views-field-nothing",
		];

		return validClasses.some((validClass) => classAttribute.includes(validClass));
	}

	private normalizePath(path: string): string {
		return path.replace(/^\.\//, "");
	}

	private async getGeolocation(address: string): Promise<any> {
		const http = require("http");
		const URI = encodeURI(address.trim());
		const URL = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team188/${URI}`;

		return new Promise((resolve) => {
			http
				.get(URL, (res: any) => {
					let data = "";

					res.on("data", (chunk: any) => {
						data += chunk;
					});

					res.on("end", () => {
						try {
							const geoResponse = JSON.parse(data);

							if (geoResponse.error) {
								resolve(null);
								return;
							}

							if (geoResponse.lat !== undefined && geoResponse.lon !== undefined) {
								resolve({ lat: geoResponse.lat, lon: geoResponse.lon });
							} else {
								resolve(null);
							}
						} catch (error) {
							console.warn("Error parsing geolocation data:", error);
							resolve(null);
						}
					});
				})
				.on("error", (error: any) => {
					console.warn("Error fetching geolocation:", error);
					resolve(null);
				});
		});
	}

	private async extractBuildingsFromIndex(table: any): Promise<
		Array<{
			href: string;
			shortname: string;
			fullname: string;
			address: string;
			lat: number;
			lon: number;
		}>
	> {
		const rows = this.findElements(table, "tr");
		const dataRows = rows.filter((row) => this.findElements(row, "th").length === 0);

		const buildingPromises = dataRows.map(async (row) => {
			try {
				const buildingData = this.extractBuildingDataFromRow(row);

				if (buildingData.shortname && buildingData.fullname && buildingData.href) {
					const geoLocation = await this.getGeolocation(buildingData.address);
					if (!geoLocation) return null;
					return {
						...buildingData,
						lat: geoLocation.lat,
						lon: geoLocation.lon,
					};
				}
				return null;
			} catch (error) {
				console.warn(error);
				return null;
			}
		});

		return (await Promise.all(buildingPromises)).filter((building): building is NonNullable<typeof building> =>
			Boolean(building)
		);
	}

	private extractBuildingDataFromRow(row: any): {
		shortname: string;
		fullname: string;
		address: string;
		href: string;
	} {
		const shortname = this.extractCellTextByClass(row, "views-field-field-building-code");
		const fullname = this.extractCellTextByClass(row, "views-field-title");
		const address = this.extractCellTextByClass(row, "views-field-field-building-address");
		const href = this.extractHrefFromRow(row);

		return {
			shortname,
			fullname,
			address,
			href,
		};
	}

	private extractHrefFromRow(row: any): string {
		const moreInfoCell = this.findCellByClass(row, "views-field-nothing");

		if (!moreInfoCell) {
			return "";
		}

		const links = this.findElements(moreInfoCell, "a");
		return links.length > 0 ? this.getAttributeValue(links[0], "href") || "" : "";
	}

	private async processBuilding(document: any, buildingInfo: any): Promise<Room[]> {
		const rooms: Room[] = [];
		const roomTable = this.findRoomTable(document);

		if (!roomTable) {
			return rooms;
		}

		const roomRows = this.findElements(roomTable, "tr");

		for (const row of roomRows) {
			try {
				if (this.findElements(row, "th").length > 0) {
					continue;
				}

				const room = this.processRoomRow(row, buildingInfo);
				if (room) {
					rooms.push(room);
				}
			} catch (err) {
				console.warn(`Failed to process room in ${buildingInfo.shortname}: ${err}`);
			}
		}

		return rooms;
	}

	private findRoomTable(document: any): any {
		const tables = this.findElements(document, "table");

		for (const table of tables) {
			const headers = this.findElements(table, "th");
			for (const header of headers) {
				const text = this.getTextContent(header).trim().toLowerCase();
				if (text.includes("room") || text.includes("capacity") || text.includes("furniture")) {
					return table;
				}
			}

			const cells = this.findElements(table, "td");
			for (const cell of cells) {
				const classValue = this.getAttributeValue(cell, "class") || "";
				if (classValue.includes("views-field-field-room-")) {
					return table;
				}
			}
		}

		return null;
	}

	private processRoomRow(row: any, buildingInfo: any): Room | null {
		try {
			const number = this.extractCellTextByClass(row, "views-field-field-room-number");
			const capacityText = this.extractCellTextByClass(row, "views-field-field-room-capacity");
			const seats = Number(capacityText) || -1;
			const furniture = this.extractCellTextByClass(row, "views-field-field-room-furniture");
			const type = this.extractCellTextByClass(row, "views-field-field-room-type");
			const href = this.findLinkHref(row, "views-field-nothing");

			if (
				!buildingInfo.fullname ||
				!buildingInfo.shortname ||
				!buildingInfo.address ||
				buildingInfo.lat === undefined ||
				buildingInfo.lon === undefined
			)
				return null;

			const name = buildingInfo.shortname + "_" + number;

			return new Room(
				buildingInfo.fullname,
				buildingInfo.shortname,
				number,
				name,
				buildingInfo.address,
				buildingInfo.lat,
				buildingInfo.lon,
				seats,
				type,
				furniture,
				href
			);
		} catch (err) {
			console.warn("Skipped due to missing field:", buildingInfo.shortname, err);
			return null;
		}
	}

	private extractCellTextByClass(row: any, className: string): string {
		const cell = this.findCellByClass(row, className);
		if (cell) {
			return this.getTextContent(cell).trim();
		} else {
			throw new Error("missing class");
		}
	}

	private findCellByClass(row: any, className: string): any {
		const cells = this.findElements(row, "td");
		return cells.find((cell) => this.hasClass(cell, className));
	}

	private findElements(node: any, tagName: string): any[] {
		const elements: any[] = [];

		const traverse = (current: any): void => {
			if (this.isElement(current) && current.tagName === tagName) {
				elements.push(current);
			}

			if (current.childNodes) {
				for (const child of current.childNodes) {
					traverse(child);
				}
			}
		};

		traverse(node);
		return elements;
	}

	private getTextContent(element: any): string {
		let text = "";

		const traverse = (node: any): void => {
			if (node.nodeName === "#text") {
				text += node.value;
			}

			if (node.childNodes) {
				for (const child of node.childNodes) {
					traverse(child);
				}
			}
		};

		traverse(element);
		return text;
	}

	private findLinkHref(node: any, className: string): string {
		const cell = this.findElements(node, "td").find((el) => this.hasClass(el, className));

		if (!cell) throw new Error("missing href class");

		const link = this.findElements(cell, "a")[0];
		return link ? this.getAttributeValue(link, "href") || "" : "";
	}

	private isElement(node: any): boolean {
		return node.nodeName !== "#text" && node.nodeName !== "#comment";
	}

	private getAttributeValue(element: any, name: string): string | null {
		const attr = element.attrs?.find((a: any) => a.name === name);
		return attr ? attr.value : null;
	}

	private hasClass(element: any, className: string): boolean {
		const classAttr = this.getAttributeValue(element, "class");
		return classAttr ? classAttr.includes(className) : false;
	}
}
