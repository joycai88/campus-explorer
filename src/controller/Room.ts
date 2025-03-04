import { InsightError } from "./IInsightFacade";

export default class Room {
	private readonly fullname: string;
	private readonly shortname: string;
	private readonly number: string;
	private readonly name: string;
	private readonly address: string;
	private readonly lat: number;
	private readonly lon: number;
	private readonly seats: number;
	private readonly type: string;
	private readonly furniture: string;
	private readonly href: string;

	constructor(
		fullname: string,
		shortname: string,
		number: string,
		name: string,
		address: string,
		lat: number,
		lon: number,
		seats: number,
		type: string,
		furniture: string,
		href: string
	) {
		const latNum = Number(lat);
		const lonNum = Number(lon);
		const seatsNum = Number(seats);

		if (isNaN(latNum)) throw new InsightError("lat must be a valid number");
		if (isNaN(lonNum)) throw new InsightError("lon must be a valid number");
		if (isNaN(seatsNum)) throw new InsightError("seats must be a valid number");

		this.fullname = fullname;
		this.shortname = shortname;
		this.number = number;
		this.name = name;
		this.address = address;
		this.lat = latNum;
		this.lon = lonNum;
		this.seats = seatsNum;
		this.type = type;
		this.furniture = furniture;
		this.href = href;
	}

	public toJSON(): object {
		return {
			fullname: this.fullname,
			shortname: this.shortname,
			number: this.number,
			name: this.name,
			address: this.address,
			lat: this.lat,
			lon: this.lon,
			seats: this.seats,
			type: this.type,
			furniture: this.furniture,
			href: this.href,
		};
	}

	public static fromJSON(json: any): Room {
		if (typeof json !== "object" || json === null) {
			throw new InsightError("Invalid JSON input");
		}

		return new Room(
			json.fullname,
			json.shortname,
			json.number,
			json.name,
			json.address,
			json.lat,
			json.lon,
			json.seats,
			json.type,
			json.furniture,
			json.href
		);
	}
}
