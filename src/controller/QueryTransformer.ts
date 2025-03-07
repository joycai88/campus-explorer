import { InsightResult, ResultTooLargeError } from "./IInsightFacade";
import Decimal from "decimal.js";

export default class QueryTransformer {
	private columns: string[] = [];
	private finalResult: InsightResult[] = [];

	constructor() {}

	/**
	 *
	 * @param result are the filtered results from WHERE
	 * @param query is the original query string
	 * Handles TRANSFORMATIONS section of the query (GROUP + APPLY)
	 */
	public handleTRANSFORM(result: InsightResult[], query: any): InsightResult[] {
		this.columns = query.OPTIONS.COLUMNS;
		this.finalResult = [];
		// handle groupings
		const groups = this.handleGROUP(result, query.TRANSFORMATIONS.GROUP);
		// handle apply
		this.handleAPPLY(groups, query.TRANSFORMATIONS.APPLY);

		//check that size of results no bigger than 5000
		const maxSize = 5000;
		if (this.finalResult.length > maxSize) {
			throw new ResultTooLargeError(
				"The result is too big. Only queries with a maximum " + "of 5000 results are supported."
			);
		}

		//order results
		if (Object.keys(query.OPTIONS).length === 2) {
			if (typeof query.OPTIONS.ORDER === "object") {
				this.handleSORT(query.OPTIONS.ORDER);
			} else {
				this.handleORDER(query.OPTIONS.ORDER);
			}
		}
		return this.finalResult;
	}

	/**
	 *
	 * @param groups is the grouped results after processing from GROUP
	 * @param apply is the APPLY query string - a list of objects
	 */
	private handleAPPLY(groups: Map<string, InsightResult[]>, apply: any[]): InsightResult[] {
		let result: InsightResult[] = [];
		for (const a of apply) {
			const name: string = Object.keys(a)[0];
			const applyRule: any = a[name];
			const applyToken: string = Object.keys(applyRule)[0];
			const key: string = applyRule[applyToken];

			if (this.columns.includes(name)) {
				if (applyToken === "AVG") result = this.handleAVG(groups, key, name);
				else if (applyToken === "MAX") result = this.handleMAX(groups, key, name);
				else if (applyToken === "MIN") result = this.handleMIN(groups, key, name);
				else if (applyToken === "SUM") result = this.handleSUM(groups, key, name);
				// applyToken === "COUNT"
				else result = this.handleCOUNT(groups, key, name);
			}
		}
		return result;
	}

	/**
	 *
	 * @param groups are the groups processed by handleGROUP()
	 * @param op the key that we want to get values from
	 * @param name the name of the avg calculation
	 * Finds the average of op for each group
	 */
	private handleAVG(groups: Map<string, InsightResult[]>, op: string, name: string): InsightResult[] {
		let counter = 0;
		groups.forEach((value) => {
			let total = new Decimal(0);
			// add each numeric value to the sum
			for (const v of value) {
				total = total.add(new Decimal(v[op]));
			}
			//find the average and add it to corresponding result group
			const avg = total.toNumber() / value.length;
			this.finalResult[counter][name] = Number(avg.toFixed(2));
			counter++;
		});
		return this.finalResult;
	}

	/**
	 *
	 * @param groups are the groups processed by handleGROUP()
	 * @param op the key that we want to get values from
	 * @param name the name of the avg calculation
	 * Finds the max value of op in each group
	 */
	private handleMAX(groups: Map<string, InsightResult[]>, op: string, name: string): InsightResult[] {
		let counter = 0;
		groups.forEach((value) => {
			let max = -Infinity;
			// if number is greater than current max, replace
			for (const v of value) {
				const curr = v[op] as number;
				if (curr > max) max = curr;
			}

			this.finalResult[counter][name] = max;
			counter++;
		});
		return this.finalResult;
	}

	/**
	 *
	 * @param groups are the groups processed by handleGROUP()
	 * @param op the key that we want to get values from
	 * @param name the name of the avg calculation
	 * Finds the smallest value of op in each group
	 */
	private handleMIN(groups: Map<string, InsightResult[]>, op: string, name: string): InsightResult[] {
		let counter = 0;
		groups.forEach((value) => {
			let min = Infinity;
			// if number is smaller than current min, replace
			for (const v of value) {
				const curr = v[op] as number;
				if (curr < min) min = curr;
			}

			this.finalResult[counter][name] = min;
			counter++;
		});
		return this.finalResult;
	}

	/**
	 *
	 * @param groups are the groups processed by handleGROUP()
	 * @param op the key that we want to get values from
	 * @param name the name of the avg calculation
	 * Finds the sum of values of op in each group
	 */
	private handleSUM(groups: Map<string, InsightResult[]>, op: string, name: string): InsightResult[] {
		let counter = 0;
		groups.forEach((value) => {
			let sum = 0;
			// add each numeric value to the sum
			for (const v of value) {
				const curr = v[op] as number;
				sum += curr;
			}
			// round final result to two decimal places
			this.finalResult[counter][name] = Number(sum.toFixed(2));
			counter++;
		});
		return this.finalResult;
	}

	/**
	 *
	 * @param groups are the groups processed by handleGROUP()
	 * @param op the key that we want to get values from (can have numeric and string values)
	 * @param name the name of the avg calculation
	 * Finds the number of unique op values in each group
	 */
	private handleCOUNT(groups: Map<string, InsightResult[]>, op: string, name: string): InsightResult[] {
		let counter = 0;
		groups.forEach((value) => {
			let unique = 0;
			const seen: (string | number)[] = [];
			// add each numeric value to the sum
			for (const v of value) {
				if (!seen.includes(v[op])) {
					seen.push(v[op]);
					unique++;
				}
			}
			// round final result to two decimal places
			this.finalResult[counter][name] = unique;
			counter++;
		});
		return this.finalResult;
	}

	/**
	 *
	 * @param result are the filtered results from WHERE
	 * @param group are the values that results need to be grouped by
	 * Handles GROUP section of the query
	 */
	private handleGROUP(result: InsightResult[], group: string[]): Map<string, InsightResult[]> {
		const groupedRes = new Map<string, InsightResult[]>();

		for (const res of result) {
			let identifier = "";
			const tempResult: { [key: string]: any } = {};
			for (const g of group) {
				identifier += res[g] + " ";
				//create possible new result grouping
				if (this.columns.includes(g)) {
					tempResult[g] = res[g];
				}
			}
			// if map already has key, then add to list, otherwise make a new key-value pair
			if (groupedRes.has(identifier)) {
				const newRes: InsightResult[] = groupedRes.get(identifier)!;
				newRes.push(res);
				groupedRes.set(identifier, newRes);
			} else {
				// add tempResult to finalResult because new group is found
				this.finalResult.push(tempResult);
				groupedRes.set(identifier, [res]);
			}
		}
		return groupedRes;
	}

	/**
	 * Parse the ORDER block of the query
	 *
	 * Citation: ChatGPT for help on using Array sort()
	 */
	private handleORDER(order: any): InsightResult[] {
		//sort the final result based on the database key (in ascending order)
		this.finalResult.sort((a, b) => {
			const valueA = a[order];
			const valueB = b[order];

			// comparing both numbers and strings
			if (valueA < valueB) return -1;
			if (valueA > valueB) return 1;
			//if values are equal
			return 0;
		});

		return this.finalResult;
	}

	/**
	 * Sorting with direction and multiple key handling
	 *
	 * Citation: based off of handleORDER code, which was written using the help of AI
	 */
	private handleSORT(sort: any): InsightResult[] {
		const dir: string = sort.dir;
		const keys: string[] = sort.keys;
		this.finalResult.sort((a, b) => {
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
		return this.finalResult;
	}
}
