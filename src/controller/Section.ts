import { InsightError } from "./IInsightFacade";
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
		const uuidString = String(uuid);
		const yearNum = Number(year);
		const avgNum = Number(avg);
		const passNum = Number(pass);
		const failNum = Number(fail);
		const auditNum = Number(audit);

		if (isNaN(yearNum)) throw new InsightError("year must be a valid number");
		if (isNaN(avgNum)) throw new InsightError("avg must be a valid number");
		if (isNaN(passNum)) throw new InsightError("pass must be a valid number");
		if (isNaN(failNum)) throw new InsightError("fail must be a valid number");
		if (isNaN(auditNum)) throw new InsightError("audit must be a valid number");

		this.uuid = uuidString;
		this.id = id;
		this.title = title;
		this.instructor = instructor;
		this.dept = dept;
		this.year = yearNum;
		this.avg = avgNum;
		this.pass = passNum;
		this.fail = failNum;
		this.audit = auditNum;
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
		if (typeof json !== "object" || json === null) {
			throw new InsightError("Invalid JSON input");
		}

		return new Section(
			json.uuid,
			json.id,
			json.title,
			json.instructor,
			json.dept,
			json.year,
			json.avg,
			json.pass,
			json.fail,
			json.audit
		);
	}
}
