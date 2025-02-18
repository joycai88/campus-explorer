import InsightFacade from "./InsightFacade";
import { InsightError } from "./IInsightFacade";

export class QueryValidator {
	private mfield: string[] = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
	private sfield: string[] = [
		"dept",
		"id",
		"instructor",
		"title",
		"uuid",
		"fullname",
		"shortname",
		"number",
		"name",
		"address",
		"type",
		"furniture",
		"href",
	];
	private mComparison: string[] = ["GT", "LT", "EQ"];
	private logic: string[] = ["AND", "OR"];
	private applyToken: string[] = ["MAX", "MIN", "AVG", "COUNT", "SUM"];

	private allDatasets: string[];
	private datasetID: string | null;
	private filterCols: string[];
	private applyKeys: string[];
	private groupKeys: string[];

	private insightFacade: InsightFacade;

	constructor(facade: InsightFacade) {
		this.insightFacade = facade;
		this.allDatasets = [];
		this.datasetID = null;
		this.filterCols = [];
		this.applyKeys = [];
		this.groupKeys = [];
	}

	public validateQuery(query: any): void {
		//get all valid dataset names
		this.allDatasets = Array.from(this.insightFacade.dataMap.keys());

		const keys = Object.keys(query);
		const maxLength = 3;

		//validate that there are either 2 or 3 keys
		if (keys.length !== 2 && keys.length !== maxLength) throw new InsightError("Invalid query string");

		if (keys.length === 2 && (!keys.includes("WHERE") || !keys.includes("OPTIONS"))) {
			throw new InsightError("Invalid query string");
		}
		if (
			keys.length === maxLength &&
			(!keys.includes("WHERE") || !keys.includes("OPTIONS") || !keys.includes("TRANSFORMATIONS"))
		) {
			throw new InsightError("Invalid query string");
		}
		//validate conditons for where clause and options clause (optional transformations clause)
		try {
			this.validateWHERE(query.WHERE);
			if (keys.length === maxLength) {
				this.validateTRANSFORMATIONS(query.TRANSFORMATIONS);
			}
			this.validateOPTIONS(query.OPTIONS);
		} catch (err) {
			throw err;
		}

		//reset datasetID
		this.allDatasets = [];
		this.datasetID = null;
		this.filterCols = [];
		this.applyKeys = [];
		this.groupKeys = [];

		return;
	}

	private validateWHERE(where: any): void {
		//check that where is a JSON object
		if (typeof where !== "object" || where === null) throw new InsightError("Invalid query string");

		const keys: string[] = Object.keys(where);

		//check that there is at most one key in where
		if (keys.length > 1) throw new InsightError("WHERE can have at most one filter");

		//skip further checks if WHERE:{}
		if (keys.length === 0) return;

		const filter = keys[0];
		//validate filters
		if (filter === "IS") this.validateSComp(where[filter]);
		else if (this.mComparison.includes(filter)) this.validateMComp(where[filter], filter);
		else if (this.logic.includes(filter)) this.validateLComp(where[filter], filter);
		else if (filter === "NOT") this.validateNOT(where[filter]);
		else throw new InsightError(`${filter} is not a valid filter`);
	}

	private validateSComp(scomp: any): void {
		//verify that scomp is an object
		if (typeof scomp !== "object" || scomp === null) throw new InsightError("Invalid query string");

		//verify that there is only one key
		if (Object.keys(scomp).length !== 1) throw new InsightError("IS must have exactly 1 key");

		const skey: string = Object.keys(scomp)[0];

		//verify that key is valid
		if (skey.split("_").length !== 2) throw new InsightError("Invalid key in IS");

		const idstring = skey.split("_")[0];
		const sfield = skey.split("_")[1];

		//check that idstring is a valid dataset id
		this.validateDatasetID(idstring);

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
		this.validateDatasetID(idstring);

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
				this.validateWHERE(f);
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
			this.validateWHERE(neg);
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

		//if transformations, verify that all column values are in transformations
		if (this.groupKeys.length !== 0) {
			for (const c of columns) {
				if (!this.groupKeys.includes(c) && !this.applyKeys.includes(c)) {
					throw new InsightError("All keys in COLUMNS must be defined in TRANSFORMATIONS");
				}
				this.filterCols.push(c);
			}
		} else {
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
				this.validateDatasetID(cid);

				//verify cfield
				if (!this.mfield.includes(cfield) && !this.sfield.includes(cfield)) {
					throw new InsightError("COLUMN includes an invalid key");
				}

				this.filterCols.push(c);
			}
		}
	}

	/**
	 * Validate SORT
	 */
	private validateORDER(sort: any): void {
		//verify that sort is either a string or an object
		if (typeof sort === "string") {
			//verify that sort key is in columns
			if (!this.filterCols.includes(sort)) {
				throw new InsightError("ORDER key is not in COLUMNS");
			}
		} else if (typeof sort === "object") {
			const keys: string[] = Object.keys(sort);
			//verify that order has two keys, dir and keys
			if (keys.length !== 2 || !keys.includes("dir")) {
				throw new InsightError(`ORDER missing "dir" key`);
			}
			if (!keys.includes("keys")) {
				throw new InsightError(`ORDER missing "keys" key`);
			}

			//verify that dir is "UP" or "DOWN"
			if (typeof sort.dir !== "string" || (sort.dir !== "UP" && sort.dir !== "DOWN")) {
				throw new InsightError("Invalid direction in ORDER");
			}

			//verify that all keys are in columns
			if (!Array.isArray(sort.keys) || sort.keys.length === 0) {
				throw new InsightError("Keys in ORDER must be a non-empty array");
			}
			for (const k of sort.keys) {
				if (!this.filterCols.includes(k)) {
					throw new InsightError(`ORDER key ${k} is not in COLUMNS`);
				}
			}
		} else {
			throw new InsightError("ORDER must be a string or object");
		}
	}

	/**
	 * Validate TRANSFORMATIONS
	 */
	private validateTRANSFORMATIONS(trans: any): void {
		//verify that trans is an object with GROUP and APPLY keys
		if (typeof trans !== "object") {
			throw new InsightError("TRANSFORMATIONS must be an object");
		}
		const keys: string[] = Object.keys(trans);
		if (!(keys.length === 2 && keys.includes("GROUP") && keys.includes("APPLY"))) {
			throw new InsightError("TRANSFORMATIONS must have GROUP and APPLY keys");
		}

		//verify that GROUP is a non-empty key list
		if (!Array.isArray(trans.GROUP) || trans.GROUP.length === 0) {
			throw new InsightError("GROUP must be a non-empty array");
		}
		for (const g of trans.GROUP) {
			if (typeof g !== "string") {
				throw new InsightError("GROUP must be an array of strings");
			}
			if (g.split("_").length !== 2) {
				throw new InsightError("Invalid key in GROUP");
			}
			const idstring = g.split("_")[0];
			const field = g.split("_")[1];

			this.validateDatasetID(idstring);

			if (!this.mfield.includes(field) && !this.sfield.includes(field)) {
				throw new InsightError("Invalid key in GROUP");
			}
			this.groupKeys.push(g);
		}

		//verify that APPLY is valid
		this.validateAPPLY(trans.APPLY);
	}

	private validateAPPLY(apply: any): void {
		//verify that apply is a list
		if (!Array.isArray(apply)) {
			throw new InsightError("APPLY must be an array");
		}
		//check that apply is a list of applyrules
		for (const a of apply) {
			//check that a is an object
			if (typeof a !== "object") {
				throw new InsightError("APPLY must be a list of objects");
			}
			//verify that there is only one key
			const keys = Object.keys(a);
			if (keys.length !== 1) {
				throw new InsightError("Invalid input query");
			}
			if (!/^[^_]+$/.test(keys[0])) {
				throw new InsightError(`${keys[0]} is an invalid key in APPLY`);
			}
			if (this.applyKeys.includes(keys[0])) {
				throw new InsightError("Duplicate keys in APPLY");
			}

			//check that the rule is valid
			const rule: any = a[keys[0]];
			this.validateRule(rule);

			this.applyKeys.push(keys[0]);
		}
	}

	private validateRule(rule: any): void {
		if (typeof rule !== "object") {
			throw new InsightError("Invalid query string");
		}
		const rKeys: string[] = Object.keys(rule);
		if (rKeys.length !== 1) {
			throw new InsightError("Invalid query string");
		}
		if (!this.applyToken.includes(rKeys[0])) {
			throw new InsightError(`Invalid apply token ${rKeys[0]}`);
		}
		//check that the key is valid
		if (typeof rule[rKeys[0]] !== "string") {
			throw new InsightError(`Invalid value of ${rKeys[0]}`);
		}
		const rVal = rule[rKeys[0]];
		if (rVal.split("_").length !== 2) throw new InsightError("Invalid key in APPLY");
		const idstring = rVal.split("_")[0];
		const field = rVal.split("_")[1];

		this.validateDatasetID(idstring);

		if (rKeys[0] !== "COUNT" && this.sfield.includes(field)) {
			throw new InsightError(`${rKeys[0]} in APPLY must have a numeric value`);
		} else if (!this.mfield.includes(field) && !this.sfield.includes(field)) {
			throw new InsightError("Invalid key in APPLY");
		}
	}

	private validateDatasetID(idstring: string): void {
		if (!/^[^_]+$/.test(idstring)) throw new InsightError("Invalid ID for dataset");
		if (!this.allDatasets.includes(idstring)) throw new InsightError("Dataset does not exist");
		if (this.datasetID === null) this.datasetID = idstring;
		else if (this.datasetID !== idstring) throw new InsightError("Only one dataset can be queried");
	}
}
