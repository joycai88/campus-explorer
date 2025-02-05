import { InsightError, InsightResult } from "./IInsightFacade";
import InsightFacade from "./InsightFacade";
import Section from "./Section";

export interface IQuery {
	where: any;
	columns: any;
	errorExpected: boolean;
	expected: any;
}

export default class QueryEngine {
	private parsedQuery: InsightResult[];
	private datasetID: string;
	private insightFacade: InsightFacade;
	private sortKey: string;
	private columns: string[];

	//constants for EBNF validation
	private filterKeys: string[] = ["GT", "LT", "EQ", "IS", "AND", "OR", "NOT"];

	constructor(insightFacade: InsightFacade) {
		this.parsedQuery = [];
		this.datasetID = "";
		this.insightFacade = insightFacade;
		this.sortKey = "";
		this.columns = [];
	}

	/**
	 * Parse the WHERE block of the query
	 */
	public async handleWHERE(where: any): Promise<InsightResult[]> {
		//if WHERE:{}, return everything
		if (Object.keys(where).length === 0) {
			return this.parsedQuery;
		}

		const promises: Promise<InsightResult[]>[] = [];

		//recurse through logic comparators in WHERE to filter options
		for (const key in where) {
			if (key === "IS") {
				promises.push(this.handleSComp(where[key]));
			} else if (key === "GT" || key === "LT" || key === "EQ") {
				promises.push(this.handleMComp(where[key], key));
			} else if (key === "AND" || key === "OR") {
				promises.push(this.handleLComp(where[key], key));
			} else if (key === "NOT") {
				promises.push(this.handleNOT(where[key]));
			}
		}

		//wait for all async functions to run
		//override parsedQuery with new filtered result
		const final: InsightResult[][] = await Promise.all(promises);
		this.parsedQuery = final[0];

		await this.handleORDER(this.sortKey, this.columns);

		return this.parsedQuery;
	}

	/**
	 * Helper for NEGATION
	 */
	private async handleNOT(neg: any): Promise<InsightResult[]> {
		//make sure neg is an object
		if (!(typeof neg === "object")) {
			throw new InsightError("NOT must be object");
		}

		//make sure neg has at least one key
		if (!(Object.keys(neg).length === 1)) {
			throw new InsightError("NOT should only have 1 key, has " + Object.keys(neg).length);
		}

		//make sure key is a filter key
		if (!this.filterKeys.includes(Object.keys(neg)[0])) {
			throw new InsightError("Invalid filter key: " + Object.keys(neg)[0]);
		}

		const notResults: InsightResult[] = await this.handleWHERE(neg);
		let allResults: InsightResult[] = this.parsedQuery;

		//filter out any results that belong to notResults
		allResults = allResults.filter((res) => notResults.some((currRes) => !this.isEqual(res, currRes)));

		return allResults;
	}

	/**
	 * Helper for LOGICCOMPARISON
	 */
	private async handleLComp(lcomp: any, cType: string): Promise<InsightResult[]> {
		//check that lcomp is a non-empty array
		if (!Array.isArray(lcomp) || lcomp.length === 0) {
			throw new InsightError("OR must be a non-empty array");
		}
		let tempResult: InsightResult[] = [];
		const promises: Promise<InsightResult[]>[] = [];

		for (const c of lcomp) {
			promises.push(this.handleWHERE(lcomp[c])); //recursive call
		}

		const allResults: InsightResult[][] = await Promise.all(promises);

		//recursion should be done at this step
		if (cType === "AND") {
			tempResult = await this.handleAND(allResults);
		} else if (cType === "OR") {
			tempResult = await this.handleOR(allResults);
		}

		return tempResult;
	}

	/**
	 * Helper to handle AND case for logic comparison
	 *
	 * Citation: Used ChatGPT for filter syntax
	 */
	private async handleAND(allResults: InsightResult[][]): Promise<InsightResult[]> {
		//if there is only one array, return
		if (allResults.length === 1) {
			return allResults[0];
		}

		//set first array as result array
		let andResult: InsightResult[] = allResults[0];

		//filter first array based on other arrays
		for (let i = 1; i < allResults.length; i++) {
			const curr = allResults[i];
			andResult = andResult.filter((res) => curr.some((currRes) => this.isEqual(res, currRes)));
		}

		return andResult;
	}

	/**
	 * Helper to handle OR case for logic comparison
	 */
	private async handleOR(allResults: InsightResult[][]): Promise<InsightResult[]> {
		//if there is only one array, return
		if (allResults.length === 1) {
			return allResults[0];
		}

		//set first array as result array
		const orResult: InsightResult[] = allResults[0];

		//add unique elements of other arrays to first array
		for (let i = 1; i < allResults.length; i++) {
			const curr = allResults[i];
			orResult.concat(curr.filter((res) => orResult.some((currRes) => !this.isEqual(res, currRes))));
		}

		return orResult;
	}

	/**
	 * "===" operator for InsightResult
	 */
	private isEqual(res: InsightResult, currRes: InsightResult): boolean {
		const givenKeys = Object.keys(res);
		const checkKeys = Object.keys(currRes);

		//check that keys are the same
		if (!(givenKeys === checkKeys)) {
			return false;
		}

		//check that values are the same
		for (const k of givenKeys) {
			if (givenKeys[k as keyof typeof givenKeys] !== checkKeys[k as keyof typeof checkKeys]) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Helper for handleWHERE to parse SCOMPARISON
	 *
	 * SCOMPARISON ::= 'IS:{' skey ': "' [*]? inputstring [*]? '" }'
	 * Asterisks at the beginning or end of the inputstring should act as wildcards.
	 */
	private async handleSComp(scomp: any): Promise<InsightResult[]> {
		//check that there is only one key
		if (Object.keys(scomp).length > 1) {
			throw new InsightError("IS should only have 1 key, has " + Object.keys(scomp).length);
		}

		const tempResults: InsightResult[] = [];

		//check for valid structure
		for (const [key, value] of Object.entries(scomp)) {
			//check for correct dataset
			if (key.split("_")[0] !== this.datasetID) {
				throw new InsightError("Cannot query more than one dataset");
			}
			//check that value is a string
			if (!(typeof value === "string")) {
				throw new InsightError("Invalid value type in IS, should be string");
			}
			//remove all items that don't belong to the result
			for (const res of this.parsedQuery) {
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
		const wc = value;
		// Case 1: exact match
		if (!wc.includes("*")) {
			return true;
		}

		// Case 2: wildcard at the start
		if (wc.startsWith("*")) {
			//Case 3: wildcard at the start and end
			if (wc.endsWith("*")) {
				wc.replace("*", "");
				return res.includes(wc);
			}
			wc.replace("*", "");
			return res.endsWith(wc);
		}
		//Case 4: wildcard at the end
		if (wc.endsWith("*")) {
			wc.replace("*", "");
			return res.startsWith(wc);
		}

		//If function gets here, the value we're comparing to is invalid
		throw new InsightError("Asterisks (*) can only be the first or last characters of input strings");
	}

	/**
	 * Helper for handleWHERE to parse MCOMPARISON
	 */
	private async handleMComp(mcomp: any, cType: string): Promise<InsightResult[]> {
		//check that there is only one key
		if (Object.keys(mcomp).length > 1) {
			throw new InsightError(cType + " should only have 1 key, has " + Object.keys(mcomp).length);
		}

		const promises: Promise<InsightResult[]>[] = [];

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
				promises.push(this.handleGT(key, value));
			} else if (cType === "LT") {
				promises.push(this.handleLT(key, value));
			} else if (cType === "EQ") {
				promises.push(this.handleEQ(key, value));
			}
		}
		const tempResult: InsightResult[][] = await Promise.all(promises);

		return tempResult[0];
	}

	/**
	 * Parse GT mcomparison
	 * If InsightResult[key] > value, then keep the InsightResult
	 */
	private async handleGT(key: string, value: number): Promise<InsightResult[]> {
		const tempResult: InsightResult[] = [];
		for (const res of this.parsedQuery) {
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
	private async handleLT(key: string, value: number): Promise<InsightResult[]> {
		const tempResult: InsightResult[] = [];
		for (const res of this.parsedQuery) {
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
	private async handleEQ(key: string, value: number): Promise<InsightResult[]> {
		const tempResult: InsightResult[] = [];
		for (const res of this.parsedQuery) {
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
	public async handleOPTIONS(options: any): Promise<InsightResult[]> {
		//check that options exists
		if (options === undefined) {
			throw new InsightError("Invalid query string");
		}
		const columns: string[] = await this.handleCOLUMNS(options.COLUMNS);
		await this.handleORDER(options.ORDER, columns);
		return this.parsedQuery;
	}

	/**
	 * Parse the COLUMNS block of the query
	 */
	public async handleCOLUMNS(columns: any): Promise<string[]> {
		//check if columns is an array
		if (!Array.isArray(columns)) {
			throw new InsightError("COLUMNS must be a non-empty array");
		}

		const parseColumns = columns as string[];

		//check if columns is non-empty
		if (parseColumns.length === 0) {
			throw new InsightError("COLUMNS must be a non-empty array");
		}

		//Assign dataset id from first column key
		this.datasetID = parseColumns[0].split("_")[0];

		const keys: string[] = [];

		//check that all keys are querying from the same dataset
		//add column names to keys
		for (const c of parseColumns) {
			const key = c.split("_");
			//check that dataset is the same
			if (key[0] !== this.datasetID) {
				throw new InsightError("Cannot query more than one dataset");
			}
			keys.push(key[1]);
		}

		//get all columns of interest from the dataset
		const allSections: Section[] | undefined = this.insightFacade.dataMap.get(this.datasetID)?.sections;
		if (!allSections) {
			throw new InsightError("Dataset ID is invalid");
		}
		for (const section of allSections) {
			let counter = 0;
			const result: InsightResult = {};

			for (const c of parseColumns) {
				result[c] = (section as any)[keys[counter]];
				counter += 1;
			}

			this.parsedQuery.push(result);
		}
		//TODO: you can probably look to optimize this
		this.columns = columns;

		return columns;
	}

	/**
	 * Parse the ORDER block of the query
	 *
	 * Citation: ChatGPT for help on using Array sort()
	 */
	public async handleORDER(order: any, columns: string[]): Promise<InsightResult[]> {
		//check if order is a string
		if (typeof order !== "string") {
			throw new InsightError("Invalid ORDER type");
		}

		//check if order exists in columns
		if (!columns.includes(order)) {
			throw new InsightError("ORDER key must be in COLUMNS");
		}

		this.sortKey = order;

		//sort the parsedQuery result based on the database key
		this.parsedQuery.sort((a, b) => {
			const valueA = a[order];
			const valueB = b[order];

			//if values are numbers, sort in ascending order
			if (typeof valueA === "number" && typeof valueB === "number") {
				return valueA - valueB;
			} else if (typeof valueA === "string" && typeof valueB === "string") {
				//sort by alphabetical order
				return valueA.localeCompare(valueB);
			} else {
				//error handling for this function to work
				throw new InsightError(`Cannot compare values of type ${typeof valueA} and ${typeof valueB}`);
			}
		});

		return this.parsedQuery;
	}
}
