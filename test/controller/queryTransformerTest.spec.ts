import { use } from "chai";
import chaiAsPromised from "chai-as-promised";
import QueryTransformer from "../../src/controller/QueryTransformer";
import { InsightResult } from "../../src/controller/IInsightFacade";
use(chaiAsPromised);

describe("queryTransformer", function () {
	const queryTransformer: QueryTransformer = new QueryTransformer();

	const groups = new Map<string, InsightResult[]>();
	groups.set("310", [
		{ sections_uuid: "1", sections_instructor: "Jean", sections_avg: 90, sections_title: "310" },
		{ sections_uuid: "2", sections_instructor: "Jean", sections_avg: 80, sections_title: "310" },
		{ sections_uuid: "3", sections_instructor: "Casey", sections_avg: 95, sections_title: "310" },
		{ sections_uuid: "4", sections_instructor: "Casey", sections_avg: 85, sections_title: "310" },
	]);
	groups.set("210", [
		{ sections_uuid: "5", sections_instructor: "Kelly", sections_avg: 74, sections_title: "210" },
		{ sections_uuid: "6", sections_instructor: "Kelly", sections_avg: 78, sections_title: "210" },
		{ sections_uuid: "7", sections_instructor: "Kelly", sections_avg: 72, sections_title: "210" },
		{ sections_uuid: "8", sections_instructor: "Eli", sections_avg: 85, sections_title: "210" },
	]);

	it("should work on handleTRANSFORM", function () {
		const result: InsightResult[] = [
			{ sections_uuid: "1", sections_instructor: "Jean", sections_avg: 90, sections_title: "310" },
			{ sections_uuid: "2", sections_instructor: "Jean", sections_avg: 80, sections_title: "310" },
			{ sections_uuid: "3", sections_instructor: "Casey", sections_avg: 95, sections_title: "310" },
			{ sections_uuid: "4", sections_instructor: "Casey", sections_avg: 85, sections_title: "310" },
			{ sections_uuid: "5", sections_instructor: "Kelly", sections_avg: 74, sections_title: "210" },
			{ sections_uuid: "6", sections_instructor: "Kelly", sections_avg: 78, sections_title: "210" },
			{ sections_uuid: "7", sections_instructor: "Kelly", sections_avg: 72, sections_title: "210" },
			{ sections_uuid: "8", sections_instructor: "Eli", sections_avg: 85, sections_title: "210" },
		];
		const group: string[] = ["sections_title"];
		const actual = queryTransformer.handleGROUP(result, group);
		console.log(actual);
		console.log(actual.size);
	});

	it("should work on handleAVG", function () {
		const transformedResult = queryTransformer.handleAVG(groups, "sections_avg", "overallAvg");
		console.log(transformedResult);
	});

	it("should work on handleMAX", function () {
		const transformedResult = queryTransformer.handleMAX(groups, "sections_avg", "maxAvg");
		console.log(transformedResult);
	});

	it("should work on handleMIN", function () {
		const transformedResult = queryTransformer.handleMIN(groups, "sections_avg", "minAvg");
		console.log(transformedResult);
	});

	it("should work on handleSUM", function () {
		const transformedResult = queryTransformer.handleSUM(groups, "sections_avg", "sumAvg");
		console.log(transformedResult);
	});

	it("should work on handleCOUNT", function () {
		const transformedResult = queryTransformer.handleCOUNT(groups, "sections_avg", "countAvg");
		console.log(transformedResult);
	});
});
