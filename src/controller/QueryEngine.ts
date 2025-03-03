import { InsightError, InsightResult, ResultTooLargeError } from "./IInsightFacade";
import InsightFacade from "./InsightFacade";
import Section from "./Section";

export default class QueryEngine {
	private parsedQuery: InsightResult[];
	private datasetID: string;
	private insightFacade: InsightFacade;
	private sortKey: string | object;
	private columns: string[];
	private dataset: InsightResult[];
	private doOrder: boolean;
	private doTransform: boolean;

	//constants for EBNF validation
	private allColumns: string[] = ["uuid", "id", "title", "instructor", "dept", "year", "avg", "pass", "fail", "audit"];

	constructor(insightFacade: InsightFacade) {
		this.parsedQuery = [];
		this.datasetID = "";
		this.insightFacade = insightFacade;
		this.sortKey = "";
		this.columns = [];
		this.dataset = [];
		this.doOrder = false;
		this.doTransform = false;
	}

	/**
	 * Clean up
	 */
	public cleanUp(): void {
		this.parsedQuery = [];
		this.datasetID = "";
		this.sortKey = "";
		this.columns = [];
		this.dataset = [];
		this.doOrder = false;
		this.doTransform = false;
	}

	/**
	 * Parse the WHERE block of the query
	 */
	public handleWHERE(where: any, hasTransform: boolean): InsightResult[] {
		this.doTransform = hasTransform;

		//if WHERE:{}, return everything
		if (Object.keys(where).length === 0) {
			this.parsedQuery = this.dataset;
			return this.finish();
		}

		//override parsedQuery with new filtered result
		this.parsedQuery = this.parseTree(where);

		return this.finish();
	}

	/**
	 * Function for recursion
	 */
	private parseTree(where: any): InsightResult[] {
		let result: InsightResult[] = [];

		//recurse through logic comparators in WHERE to filter options
		for (const key in where) {
			if (key === "IS") {
				result = this.handleSComp(where[key]);
			} else if (key === "GT" || key === "LT" || key === "EQ") {
				result = this.handleMComp(where[key], key);
			} else if (key === "AND" || key === "OR") {
				result = this.handleLComp(where[key], key);
			} else if (key === "NOT") {
				result = this.handleNOT(where[key]);
			}
		}
		return result;
	}

	/**
	 * Helper for NEGATION
	 *
	 * Citation: used ChatGPT to optimize filtering
	 */
	private handleNOT(neg: any): InsightResult[] {
		const notResults: InsightResult[] = this.parseTree(neg);
		let allResults: InsightResult[] = this.dataset;

		//filter out any results that belong to notResults
		const notResultsSet = new Set(notResults.map((res) => JSON.stringify(res)));
		allResults = allResults.filter((res) => !notResultsSet.has(JSON.stringify(res)));

		return allResults;
	}

	/**
	 * Helper for LOGICCOMPARISON
	 */
	private handleLComp(lcomp: any, cType: string): InsightResult[] {
		const allResults: InsightResult[][] = lcomp.map((c: any) => this.parseTree(c));

		//recursion should be done at this step
		if (cType === "AND") {
			return this.handleAND(allResults);
		} else if (cType === "OR") {
			return this.handleOR(allResults);
		}
		return [];
	}

	/**
	 * Helper to handle AND case for logic comparison
	 *
	 * Citation: Used ChatGPT for filter syntax and performance improvements
	 */
	private handleAND(allResults: InsightResult[][]): InsightResult[] {
		//if there is only one array, return
		if (allResults.length === 1) {
			return allResults[0];
		}

		//set first array as result array
		let andResult: InsightResult[] = allResults[0];

		//filter first array based on other arrays
		for (let i = 1; i < allResults.length; i++) {
			const curr = allResults[i];

			const currSet = new Set(curr.map((res) => JSON.stringify(res)));
			andResult = andResult.filter((res) => currSet.has(JSON.stringify(res)));
		}

		return andResult;
	}

	/**
	 * Helper to handle OR case for logic comparison
	 *
	 * Citation: ChatGPT used for set performance improvement
	 */
	private handleOR(allResults: InsightResult[][]): InsightResult[] {
		//if there is only one array, return
		if (allResults.length === 1) {
			return allResults[0];
		}

		const orResultSet = new Set<string>();
		for (const results of allResults) {
			for (const res of results) {
				orResultSet.add(JSON.stringify(res));
			}
		}

		return Array.from(orResultSet).map((res) => JSON.parse(res));
	}

	/**
	 * Helper for handleWHERE to parse SCOMPARISON
	 *
	 * SCOMPARISON ::= 'IS:{' skey ': "' [*]? inputstring [*]? '" }'
	 * Asterisks at the beginning or end of the inputstring should act as wildcards.
	 */
	private handleSComp(scomp: any): InsightResult[] {
		const tempResults: InsightResult[] = [];

		//check for valid structure
		for (const [key, value] of Object.entries(scomp)) {
			//check that value is a string
			if (!(typeof value === "string")) {
				throw new InsightError("Invalid value type in IS, should be string");
			}
			//remove all items that don't belong to the result
			for (const res of this.dataset) {
				//check that type is correct
				if (!(typeof res[key] === "string")) {
					throw new InsightError("Invalid key " + key + " in IS");
				}
				// filter out incompatible results
				if (this.isCompMatch(res[key], value)) {
					tempResults.push(res);
				}
			}
		}

		return tempResults;
	}

	/**
	 * Private helper to determine if string is a match (wildcard handling)
	 */
	private isCompMatch(res: string, value: string): boolean {
		let wc = value;
		// Case 1: exact match
		if (!wc.includes("*")) {
			return res === value;
		}

		// Case 2: wildcard at the start
		if (wc.startsWith("*")) {
			//Case 3: wildcard at the start and end
			if (wc.endsWith("*")) {
				wc = wc.slice(1, -1);
				if (!wc.includes("*")) {
					return res.includes(wc);
				} else {
					throw new InsightError("Asterisks (*) can only be the first or last characters of input strings");
				}
			}
			wc = wc.slice(1);
			if (!wc.includes("*")) {
				return res.endsWith(wc);
			}
		}
		//Case 4: wildcard at the end
		if (wc.endsWith("*")) {
			wc = wc.slice(0, -1);
			if (!wc.includes("*")) {
				return res.startsWith(wc);
			}
		}

		//If function gets here, the value we're comparing to is invalid
		throw new InsightError("Asterisks (*) can only be the first or last characters of input strings");
	}

	/**
	 * Helper for handleWHERE to parse MCOMPARISON
	 */
	private handleMComp(mcomp: any, cType: string): InsightResult[] {
		//check that there is only one key
		if (Object.keys(mcomp).length > 1) {
			throw new InsightError(cType + " should only have 1 key, has " + Object.keys(mcomp).length);
		}

		let result: InsightResult[] = [];

		//check for valid structure - MCOMPARISON ::= MCOMPARATOR ':{' mkey ':' number '}'
		for (const [key, value] of Object.entries(mcomp)) {
			//check for correct dataset
			if (key.split("_")[0] !== this.datasetID) {
				throw new InsightError("Cannot query more than one dataset");
			}
			//check that value is a number
			if (!(typeof value === "number")) {
				throw new InsightError("Invalid value type in " + cType + ", should be number");
			}
			//remove all items that don't belong to the result
			if (cType === "GT") {
				result = this.handleGT(key, value);
			} else if (cType === "LT") {
				result = this.handleLT(key, value);
			} else if (cType === "EQ") {
				result = this.handleEQ(key, value);
			}
		}

		return result;
	}

	/**
	 * Parse GT mcomparison
	 * If InsightResult[key] > value, then keep the InsightResult
	 */
	private handleGT(key: string, value: number): InsightResult[] {
		const tempResult: InsightResult[] = [];
		for (const res of this.dataset) {
			//check that we're getting a number back from dataset
			if (!(typeof res[key] === "number")) {
				throw new InsightError("Invalid key " + key + " in GT");
			}
			if (res[key] > value) {
				tempResult.push(res);
			}
		}
		return tempResult;
	}

	/**
	 * Parse LT mcomparison
	 * If InsightResult[key] < value, then keep the InsightResult
	 */
	private handleLT(key: string, value: number): InsightResult[] {
		const tempResult: InsightResult[] = [];
		for (const res of this.dataset) {
			//check that we're getting a number back from dataset
			if (!(typeof res[key] === "number")) {
				throw new InsightError("Invalid key " + key + " in LT");
			}
			if (res[key] < value) {
				tempResult.push(res);
			}
		}
		return tempResult;
	}

	/**
	 * Parse EQ mcomparison
	 * If InsightResult[key] === value, then keep the InsightResult
	 */
	private handleEQ(key: string, value: number): InsightResult[] {
		const tempResult: InsightResult[] = [];
		for (const res of this.dataset) {
			//check that we're getting a number back from dataset
			if (!(typeof res[key] === "number")) {
				throw new InsightError("Invalid key " + key + " in EQ");
			}
			if (res[key] === value) {
				tempResult.push(res);
			}
		}
		return tempResult;
	}

	/**
	 * Parse the OPTIONS block of the query
	 */
	public handleOPTIONS(options: any, datasetID: string | null): InsightResult[] {
		this.datasetID = datasetID!;
		this.columns = this.handleCOLUMNS(options.COLUMNS);

		//only order if order exists
		if (Object.keys(options).length === 2) {
			this.doOrder = true;
			this.sortKey = options.ORDER;
		}
		return this.parsedQuery;
	}

	/**
	 * Ending work such as filtering columns & ordering
	 */
	public finish(): InsightResult[] {
		//only filter the columns if there is no transformation
		//otherwise QueryTransformer will handle the columns
		if (this.doTransform) return this.parsedQuery;

		const tempResult: InsightResult[] = [];

		for (const res of this.parsedQuery) {
			const result: InsightResult = {};

			for (const [key, value] of Object.entries(res)) {
				if (this.columns.includes(key)) {
					result[key] = value;
				}
			}
			tempResult.push(result);
		}

		this.parsedQuery = tempResult;
		//check that size of results no bigger than 5000
		const maxSize = 5000;
		if (this.parsedQuery.length > maxSize) {
			throw new ResultTooLargeError(
				"The result is too big. Only queries with a maximum " + "of 5000 results are supported."
			);
		}

		if (this.doOrder) {
			if (typeof this.sortKey === "object") {
				this.handleSORT(this.sortKey);
			} else {
				this.handleORDER(this.sortKey);
			}
		}

		return this.parsedQuery;
	}

	/**
	 * Parse the COLUMNS block of the query
	 */
	public handleCOLUMNS(columns: any): string[] {
		this.columns = columns;

		//get all columns of interest from the dataset
		const allSections: Section[] | undefined = this.insightFacade.dataMap.get(this.datasetID)?.getSections();

		if (!allSections) {
			throw new InsightError("Dataset ID is invalid");
		}

		//setup whole dataset
		for (const section of allSections) {
			const result: InsightResult = {};
			for (const column of this.allColumns) {
				result[this.datasetID + "_" + column] = (section as any)[column];
			}
			this.dataset.push(result);
		}

		return this.columns;
	}

	/**
	 * Parse the ORDER block of the query
	 *
	 * Citation: ChatGPT for help on using Array sort()
	 */
	public handleORDER(order: any): InsightResult[] {
		//sort the parsedQuery result based on the database key (in ascending order)
		this.parsedQuery.sort((a, b) => {
			const valueA = a[order];
			const valueB = b[order];

			// comparing both numbers and strings
			if (valueA < valueB) return -1;
			if (valueA > valueB) return 1;
			//if values are equal
			return 0;
		});

		return this.parsedQuery;
	}

	/**
	 * Sorting with direction and multiple key handling
	 *
	 * Citation: based off of handleORDER code, which was written using the help of AI
	 */
	private handleSORT(sort: any): InsightResult[] {
		const dir: string = sort.dir;
		const keys: string[] = sort.keys;
		this.parsedQuery.sort((a, b) => {
			for (const key of keys) {
				const valueA = a[key];
				const valueB = b[key];

				// comparing both numbers and strings
				if (valueA < valueB) {
					// if direction is descending, reverse the  order
					if (dir === "DOWN") return 1;
					return -1;
				}
				if (valueA > valueB) {
					if (dir === "DOWN") return -1;
					return 1;
				}
			}
			//if all keys are equal
			return 0;
		});
		return this.parsedQuery;
	}
}
