export default class Section {
	private readonly uuid: string;
	private readonly id: string;
	private readonly title: string;
	private readonly instructor: string;
	private readonly dept: string;
	private readonly year: number;
	private readonly avg: number;
	private readonly pass: number;
	private readonly fail: number;
	private readonly audit: number;

	constructor(
		uuid: string,
		id: string,
		title: string,
		instructor: string,
		dept: string,
		year: number,
		avg: number,
		pass: number,
		fail: number,
		audit: number
	) {
		this.uuid = uuid.toString();
		this.id = id;
		this.title = title;
		this.instructor = instructor;
		this.dept = dept;
		this.year = Number(year);
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
}
