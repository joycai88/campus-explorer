export default class Section {
	private readonly uuid: string;
	private readonly id: string;
	private readonly title: string;
	private readonly instructor: string;
	private readonly dept: string;
	private readonly year: string;
	private readonly avg: string;
	private readonly pass: string;
	private readonly fail: string;
	private readonly audit: string;

	constructor(
		uuid: string,
		id: string,
		title: string,
		instructor: string,
		dept: string,
		year: string,
		avg: string,
		pass: string,
		fail: string,
		audit: string
	) {
		this.uuid = uuid;
		this.id = id;
		this.title = title;
		this.instructor = instructor;
		this.dept = dept;
		this.year = year;
		this.avg = avg;
		this.pass = pass;
		this.fail = fail;
		this.audit = audit;
	}

	public toJSON(): object {
		return {
			uuid: this.uuid,
			id: this.id,
			title: this.title,
			instructor: this.instructor,
			dept: this.dept,
			year: this.year,
			avg: this.avg,
			pass: this.pass,
			fail: this.fail,
			audit: this.audit,
		};
	}

	public static fromJSON(json: any): Section {
		return new Section(
			json.uuid,
			json.id,
			json.title,
			json.instructor,
			json.subject,
			json.year,
			json.avg,
			json.pass,
			json.fail,
			json.audit
		);
	}

	// public get(key: string): string {
	// 	if (key === "uuid") {
	// 		return this.uuid;
	// 	} else if (key === "id") {
	// 		return this.id;
	// 	} else if (key === "title") {
	// 		return this.title;
	// 	} else if (key === "instructor") {
	// 		return this.instructor;
	// 	} else if (key === "dept") {
	// 		return this.dept;
	// 	} else if (key === "year") {
	// 		return this.year;
	// 	} else if (key === "avg") {
	// 		return this.avg;
	// 	} else if (key === "pass") {
	// 		return this.pass;
	// 	} else if (key === "fail") {
	// 		return this.fail;
	// 	} else if (key === "audit") {
	// 		return this.audit;
	// 	} else {
	// 		throw new Error(`Property ${key} not found.`);
	// 	}
	// }
}
