import InsightFacade from "./InsightFacade";
import { InsightError } from "./IInsightFacade";

export class QueryValidator {
	private mfield: string[] = ["avg", "pass", "fail", "audit", "year"];
	private sfield: string[] = ["dept", "id", "instructor", "title", "uuid"];
	private mComparison: string[] = ["GT", "LT", "EQ"];
	private logic: string[] = ["AND", "OR"];

	private allDatasets: string[];
	private datasetID: string;
	private filterCols: string[];

	private insightFacade: InsightFacade;

	constructor(facade: InsightFacade) {
		this.insightFacade = facade;
		this.allDatasets = [];
		this.datasetID = "";
		this.filterCols = [];
	}

	public validateQuery(query: any): void {
		//get all valid dataset names
		this.allDatasets = Array.from(this.insightFacade.dataMap.keys());

		//validate that there are only 2 keys, where and option
		if (Object.keys(query).length !== 2) {
			throw new InsightError("Invalid query string");
		}
		if (!Object.keys(query).includes("WHERE") || !Object.keys(query).includes("OPTIONS")) {
			throw new InsightError("Invalid query string");
		}

		//validate conditons for where clause and options clause
		try {
			this.validateWHERE(query.WHERE);
			this.validateOPTIONS(query.OPTIONS);
		} catch (err) {
			throw err;
		}

		//reset datasetID
		this.allDatasets = [];
		this.datasetID = "";
		this.filterCols = [];

		return;
	}

	private validateWHERE(where: any): void {
		//check that where is a JSON object
		if (typeof where !== "object" || where === null) {
			throw new InsightError("Invalid query string");
		}

		this.validateTree(where);

		return;
	}

	private validateTree(where: any): void {
		const keys: string[] = Object.keys(where);

		//check that there is at most one key in where
		if (!(keys.length <= 1)) {
			throw new InsightError("WHERE can have at most one filter");
		}

		//skip further checks if WHERE:{}
		if (keys.length === 0) {
			return;
		}

		const filter = keys[0];
		//validate filters
		if (filter === "IS") {
			this.validateSComp(where[filter]);
		} else if (this.mComparison.includes(filter)) {
			this.validateMComp(where[filter], filter);
		} else if (this.logic.includes(filter)) {
			this.validateLComp(where[filter], filter);
		} else if (filter === "NOT") {
			this.validateNOT(where[filter]);
		} else {
			throw new InsightError(`${filter} is not a valid filter`);
		}
	}

	private validateSComp(scomp: any): void {
		//verify that scomp is an object
		if (typeof scomp !== "object" || scomp === null) {
			throw new InsightError("Invalid query string");
		}

		//verify that there is only one key
		if (Object.keys(scomp).length !== 1) {
			throw new InsightError("IS must have exactly 1 key");
		}

		const skey: string = Object.keys(scomp)[0];

		//verify that key is valid
		if (skey.split("_").length !== 2) {
			throw new InsightError("Invalid key in IS");
		}
		const idstring = skey.split("_")[0];
		const sfield = skey.split("_")[1];

		//check that idstring is a valid dataset id
		if (!this.allDatasets.includes(idstring)) {
			throw new InsightError("Invalid dataset queried in IS");
		}
		if (this.datasetID === "") {
			this.datasetID = idstring;
		} else {
			if (idstring !== this.datasetID) {
				throw new InsightError("Only one dataset can be queried");
			}
		}

		//check that sfield is valid
		if (!this.sfield.includes(sfield)) {
			throw new InsightError(`Invalid key ${skey} in IS`);
		}

		//check that input string is a string
		if (typeof scomp[skey] !== "string") {
			throw new InsightError(`Value of ${skey} must be a string`);
		}
	}

	private validateMComp(mcomp: any, filter: string): void {
		//verify that mcomp is an object
		if (typeof mcomp !== "object" || mcomp === null) {
			throw new InsightError("Invalid query string");
		}
		//verify that there is only one key
		if (Object.keys(mcomp).length !== 1) {
			throw new InsightError(`${filter} should only have 1 key`);
		}

		const mkey: string = Object.keys(mcomp)[0];

		//verify that key is valid
		if (mkey.split("_").length !== 2) {
			throw new InsightError(`Invalid key in ${filter}`);
		}
		const idstring = mkey.split("_")[0];
		const mfield = mkey.split("_")[1];

		//check that idstring is a valid dataset id
		if (!this.allDatasets.includes(idstring)) {
			throw new InsightError(`Invalid dataset queried in ${filter}`);
		}
		if (this.datasetID === "") {
			this.datasetID = idstring;
		} else {
			if (idstring !== this.datasetID) {
				throw new InsightError("Only one dataset can be queried");
			}
		}

		//check that mfield is valid
		if (!this.mfield.includes(mfield)) {
			throw new InsightError(`Invalid key ${mkey} in ${filter}`);
		}

		//check that input string is a string
		if (typeof mcomp[mkey] !== "number") {
			throw new InsightError(`Value of ${mkey} must be a number`);
		}
	}

	private validateLComp(lcomp: any, filter: string): void {
		//check that lcomp is a non-empty array
		if (!Array.isArray(lcomp) || lcomp.length === 0) {
			throw new InsightError(`${filter} must be a non-empty array`);
		}
		//check that each element in lcomp is also valid
		for (const f of lcomp) {
			try {
				this.validateTree(f);
			} catch (err) {
				throw err;
			}
		}
	}

	private validateNOT(neg: any): void {
		//verify that neg is an object
		if (typeof neg !== "object" || neg === null) {
			throw new InsightError("Invalid query string");
		}

		//verify that there is only one filter in neg
		if (Object.keys(neg).length !== 1) {
			throw new InsightError("NOT must include exactly 1 filter");
		}

		//verify that filter is valid
		try {
			this.validateTree(neg);
		} catch (err) {
			throw err;
		}
	}

	private validateOPTIONS(options: any): void {
		//verify that options is an object
		if (typeof options !== "object" || options === null) {
			throw new InsightError("Invalid query string");
		}

		const keys = Object.keys(options);
		//make sure COLUMNS is a key
		if (keys.length > 2 || !keys.includes("COLUMNS")) {
			throw new InsightError("OPTIONS must have a maximum of 2 keys, including COLUMNS");
		}

		this.validateCOLUMNS(options.COLUMNS);

		//if keys has 2 keys, check that the other is order
		if (keys.length === 2) {
			if (keys.includes("ORDER")) {
				this.validateORDER(options.ORDER);
				return;
			}
			throw new InsightError("Invalid key in COLUMNS");
		}
	}

	private validateCOLUMNS(columns: any): void {
		//verify that columns is a non-empty array
		if (!Array.isArray(columns) || columns.length === 0) {
			throw new InsightError(`COLUMNS must be a non-empty array`);
		}

		//verify that columns are valid
		for (const c of columns) {
			//verify that c is a string
			if (typeof c !== "string") {
				throw new InsightError("Invalid type of COLUMN key");
			}
			//verify that c has a valid section
			if (c.split("_").length !== 2) {
				throw new InsightError("Invalid key in COLUMN");
			}
			const cid = c.split("_")[0];
			const cfield = c.split("_")[1];

			//verify that cid is valid
			if (!this.allDatasets.includes(cid)) {
				throw new InsightError("COLUMN includes an invalid dataset");
			}
			if (this.datasetID === "") {
				this.datasetID = cid;
			} else {
				if (this.datasetID !== cid) {
					throw new InsightError("Only one dataset can be queried");
				}
			}

			//verify cfield
			if (!this.mfield.includes(cfield) && !this.sfield.includes(cfield)) {
				throw new InsightError("COLUMN includes an invalid key");
			}

			this.filterCols.push(c);
		}
	}

	private validateORDER(order: any): void {
		//verify that order is a string
		if (typeof order !== "string") {
			throw new InsightError("ORDER must be a string");
		}

		//verify that order is in columns
		if (!this.filterCols.includes(order)) {
			throw new InsightError("ORDER key is not in COLUMNS");
		}
	}
}
