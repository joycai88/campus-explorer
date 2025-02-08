import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	ResultTooLargeError,
	NotFoundError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
use(chaiAsPromised);

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let testSections: string;
	let easy: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		testSections = await getContentFromArchives("test.zip");
		easy = await getContentFromArchives("simplest.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("AddDataset", function () {
		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("should reject with  an empty dataset id", async function () {
			// Read the "Free Mutant Walkthrough" in the spec for tips on how to get started!
			try {
				await facade.addDataset("", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should pass with valid id", async function () {
			try {
				const result = await facade.addDataset("1", sections, InsightDatasetKind.Sections);
				expect(result).to.be.an("array").with.lengthOf(1);
				expect(result).to.include("1");
			} catch (err) {
				expect.fail(`Should not have thrown, but threw ${err}`);
			}
		});

		it("should pass with multiple adds", async function () {
			try {
				const result = await facade.addDataset("1", sections, InsightDatasetKind.Sections);
				expect(result).to.be.an("array").with.lengthOf(1);
				expect(result).to.include("1");
				const result2 = await facade.addDataset("2", sections, InsightDatasetKind.Sections);
				expect(result2).to.include("1");
				expect(result2).to.include("2");
			} catch (err) {
				expect.fail(`Should not have thrown, but threw ${err}`);
			}
		});

		it("should reject when adding dataset with duplicate id", async function () {
			try {
				await facade.addDataset("1", sections, InsightDatasetKind.Sections);
				await facade.addDataset("1", sections, InsightDatasetKind.Sections);

				expect.fail("Should have thrown error for duplicate id");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject dataset with diff content but duplicate id", async function () {
			try {
				await facade.addDataset("1", sections, InsightDatasetKind.Sections);
				await facade.addDataset("1", testSections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown error for duplicate id");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject id with underscore for add", async function () {
			try {
				await facade.addDataset("_1", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown error for invalid id");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject id with only whitespace for add", async function () {
			try {
				await facade.addDataset(" ", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown error for invalid id");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject rooms for kind", async function () {
			try {
				await facade.addDataset("1", sections, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown error for invalid kind");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject when given invalid base64 string", async function () {
			const invalidBase64 = "invalid_string";
			try {
				await facade.addDataset("1", invalidBase64, InsightDatasetKind.Sections);
				expect.fail("Should have thrown an error for invalid base64.");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject when 'courses/' folder is missing", async function () {
			const invalidZip = await getContentFromArchives("missing_courses.zip");
			try {
				await facade.addDataset("1", invalidZip, InsightDatasetKind.Sections);
				expect.fail("Should have thrown an error for missing 'courses/' folder.");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject when a file in 'courses/' is not JSON", async function () {
			const invalidZip = await getContentFromArchives("not_JSON.zip");
			try {
				await facade.addDataset("1", invalidZip, InsightDatasetKind.Sections);
				expect.fail("Should have thrown an error for invalid JSON file.");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject when JSON does not contain 'result' key", async function () {
			const invalidZip = await getContentFromArchives("missing_result_key.zip");
			try {
				await facade.addDataset("1", invalidZip, InsightDatasetKind.Sections);
				expect.fail("Should have thrown an error for missing 'result' key.");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject when only section is missing a query key", async function () {
			const invalidZip = await getContentFromArchives("invalid_section.zip");
			try {
				await facade.addDataset("1", invalidZip, InsightDatasetKind.Sections);
				expect.fail("Should have thrown an error for invalid section.");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should pass with one valid section", async function () {
			try {
				const result = await facade.addDataset("1", testSections, InsightDatasetKind.Sections);
				expect(result).to.be.an("array");
				expect(result).to.include("1");
			} catch (err) {
				expect.fail(`Should not have thrown, but threw ${err}`);
			}
		});

		it("should reject when only section is empty results", async function () {
			const emptyZip = await getContentFromArchives("empty_section.zip");
			try {
				await facade.addDataset("1", emptyZip, InsightDatasetKind.Sections);
				expect.fail("Should have thrown an error for empty courses.");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject when courses is empty", async function () {
			const emptyZip = await getContentFromArchives("empty.zip");
			try {
				await facade.addDataset("1", emptyZip, InsightDatasetKind.Sections);
				expect.fail("Should have thrown an error for empty courses.");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});
	});

	describe("RemoveDataset", function () {
		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("should return string for successful removal", async function () {
			try {
				await facade.addDataset("1", sections, InsightDatasetKind.Sections);
				const result = await facade.removeDataset("1");
				expect(result).to.be.a("string");
			} catch (err) {
				expect.fail(`Should not have thrown ${err}`);
			}
		});

		it("should reject when removed twice", async function () {
			try {
				await facade.addDataset("1", sections, InsightDatasetKind.Sections);
				const result = await facade.removeDataset("1");
				expect(result).to.be.a("string");
				await facade.removeDataset("1");
				expect.fail("Should have thrown an error for removing dataset that has already been removed");
			} catch (err) {
				expect(err).to.be.an.instanceOf(NotFoundError);
			}
		});

		it("should reject for ID that does not exist", async function () {
			try {
				await facade.removeDataset("2");
				expect.fail("Should have thrown an error for ID not found.");
			} catch (err) {
				expect(err).to.be.an.instanceOf(NotFoundError);
			}
		});

		it("should reject id with underscore for remove", async function () {
			try {
				await facade.removeDataset("_1");
				expect.fail("Should have thrown error for invalid id");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject id with only whitespace for remove", async function () {
			try {
				await facade.removeDataset(" ");
				expect.fail("Should have thrown error for invalid id");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject id with an empty dataset id", async function () {
			try {
				await facade.removeDataset("");
				expect.fail("Should have thrown error for invalid id");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});
	});

	describe("ListDataSets", function () {
		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("should return empty array when no datasets are added", async function () {
			try {
				const result = await facade.listDatasets();
				expect(result).to.be.an("array");
				expect(result.length).to.equal(0);
			} catch (err) {
				expect.fail(`Should not have thrown ${err}`);
			}
		});

		it("should return one dataset after a single valid dataset is added", async function () {
			try {
				const id = "ubc";
				const kind = InsightDatasetKind.Sections;
				await facade.addDataset(id, sections, kind);

				const result = await facade.listDatasets();

				expect(result).to.be.an("array").that.has.lengthOf(1);
				expect(result[0]).to.deep.equal({
					id: id,
					kind: kind,
					numRows: 64612,
				});
			} catch (err) {
				expect.fail(`Should not have thrown ${err}`);
			}
		});

		it("should return multiple datasets after multiple valid datasets are added", async function () {
			try {
				await facade.addDataset("1", sections, InsightDatasetKind.Sections);
				await facade.addDataset("2", sections, InsightDatasetKind.Sections);

				const result = await facade.listDatasets();

				expect(result).to.deep.include.members([
					{
						id: "1",
						kind: InsightDatasetKind.Sections,
						numRows: 64612,
					},
					{
						id: "2",
						kind: InsightDatasetKind.Sections,
						numRows: 64612,
					},
				]);
			} catch (err) {
				expect.fail(`Should not have thrown ${err}`);
			}
		});
	});

	describe("Cache", function () {
		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
			await facade.addDataset("test", testSections, InsightDatasetKind.Sections);
		});

		it("should be able to list dataset from new instance", async function () {
			const facade2 = new InsightFacade();
			const result = await facade2.listDatasets();
			expect(result).to.deep.equal([
				{
					id: "test",
					kind: InsightDatasetKind.Sections,
					numRows: 2,
				},
			]);
			expect(result).to.be.an("array").that.has.lengthOf(1);
		});

		it("should be able to remove dataset from new instance", async function () {
			const facade2 = new InsightFacade();
			const result = await facade2.removeDataset("test");

			expect(result).to.be.a("string");
		});
	});

	describe("PerformQuery", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */
		async function checkQuery(this: Mocha.Context): Promise<void> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
			let result: InsightResult[] = []; // dummy value before being reassigned
			try {
				result = await facade.performQuery(input);
			} catch (err) {
				if (!errorExpected) {
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}
				if (expected === "ResultTooLargeError") {
					expect(err).to.be.instanceOf(ResultTooLargeError);
				} else {
					expect(err).to.be.instanceOf(InsightError);
				}
				return;
			}
			if (errorExpected) {
				expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
			}

			expect(result).to.have.deep.members(expected);
		}

		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("easy", easy, InsightDatasetKind.Sections),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		it("[valid/leftWildcard.json] easy_dept = a*", checkQuery); //pass
		it("[valid/rightWildcard.json] easy_dept = *b", checkQuery); //pass
		it("[valid/bothWildcard.json] easy_dept = *n*", checkQuery); //pass
		it("[valid/noWildcard.json] easy_dept = aanb", checkQuery); //pass
		it("[valid/logicComp.json] AND logic comparison", checkQuery); //pass
		it("[valid/not.json] NOT logic comparison", checkQuery); //pass
		it("[valid/passComp.json] pass <= 5", checkQuery); //pass
		it("[valid/complex.json] complex query", checkQuery);
		it("[valid/repeatedCol.json] repeated COLUMN", checkQuery); //pass
		it("[valid/allColumns.json] all columns", checkQuery); //pass
		it("[valid/showOneColumn.json] show one column", checkQuery); //pass
		it("[valid/emptyResults.json] empty results", checkQuery); //pass
		it("[valid/capsValue.json] caps value", checkQuery); //pass
		it("[valid/oneSection.json] one section", checkQuery); //pass
		it("[valid/emptyWhere.json] empty where", checkQuery); //pass
		it("[valid/noOrder.json] missing order but still valid", checkQuery);
		it("[valid/oneColumn.json] one column", checkQuery);
		it("[valid/decimalDataset.json] decimal dataset", checkQuery);
		it("[valid/decimalDatasetGt.json] decimal dataset gt", checkQuery);

		it("[invalid/invalid.json] Query missing WHERE", checkQuery);
		it("[invalid/tooLarge.json] Query >= 5000 results", checkQuery);
		it("[invalid/noDataset.json] Query referencing unadded dataset", checkQuery);
		it("[invalid/twoDataset.json] Query referencing two datasets", checkQuery);
		it("[invalid/midWildcard.json] easy_dept = a*b", checkQuery);
		it("[invalid/badOrder.json] ORDER key not in COLUMNS", checkQuery);
		it("[invalid/badType.json] format of dept is not string", checkQuery);
		it("[invalid/EQBad.json] EQ with string comparison", checkQuery);
		it("[invalid/invalidDatasetKey.json] invalid dataset key", checkQuery);
		it("[invalid/missingColumns.json] missing columns", checkQuery);
		it("[invalid/missingOptions.json] missing options", checkQuery);
		it("[invalid/caseSensitive.json] case sensitive", checkQuery);
		it("[invalid/boolDatatype.json] bool datatype", checkQuery);
		it("[invalid/emptyColumns.json] empty columns", checkQuery);
		it("[invalid/twoExistingDatasets.json] two existing datasets", checkQuery);
		it("[invalid/numberIS.json] number IS", checkQuery);
		it("[invalid/noQuery.json] no query", checkQuery);
		it("[invalid/complexTooLarge.json] complex too large", checkQuery);
		it("[invalid/multipleAsterisks.json] multiple asterisks", checkQuery);
		it("[invalid/multipleAsterisksEnd.json] multiple asterisks end", checkQuery);
		it("[invalid/multipleAsterisksStart.json] multiple asterisks start", checkQuery);
		it("[invalid/unaddedDataset.json] unadded dataset", checkQuery);
		it("[invalid/justTripleWildcard.json] just triple wildcard", checkQuery);
		it("[invalid/nullInput.json] null input", checkQuery);
		it("[invalid/emptyStringDataset.json] empty string dataset", checkQuery);

		it("[valid/complexWildcard.json] complex wildcard", checkQuery);
		it("[valid/complexNot.json] complex not", checkQuery);
		it("[valid/justWildcard.json] just wildcard", checkQuery);
		it("[valid/justDoubleWildcard.json] just double wildcard", checkQuery);

		//unit tests for MCOMP
		it("[valid/mCompEQ.json] MComp EQ", checkQuery);
		it("[valid/mCompLT.json] MComp LT", checkQuery);
		it("[valid/mCompGT.json] MComp GT", checkQuery);

		//unit tests for LOGIC
		it("[valid/andWithOneElement.json] and with one element", checkQuery);
		it("[valid/orWithOneElement.json] or with one element", checkQuery);

		//unit tests for SCOMP

		//unit tests for NEGATION
		it("[valid/nestedNots.json] nested nots", checkQuery);
	});

	describe("handleOrder", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */
		async function checkQuery(this: Mocha.Context): Promise<void> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
			let result: InsightResult[] = []; // dummy value before being reassigned
			try {
				result = await facade.performQuery(input);
			} catch (err) {
				if (!errorExpected) {
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}
				if (expected === "ResultTooLargeError") {
					expect(err).to.be.instanceOf(ResultTooLargeError);
				} else {
					expect(err).to.be.instanceOf(InsightError);
				}
				return;
			}
			if (errorExpected) {
				expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
			}

			expect(result).deep.equal(expected);
		}

		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("easy", easy, InsightDatasetKind.Sections),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		it("[valid/uuidOrder.json] uuid order", checkQuery);
	});
});
