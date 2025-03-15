import { expect } from "chai";
import request from "supertest";
import { StatusCodes } from "http-status-codes";
import { Log } from "@ubccpsc310/project-support";
import Server from "../../src/rest/Server";
import fs from "fs-extra";
import { InsightDatasetKind } from "../../src/controller/IInsightFacade";

describe("Facade C3", function () {
	let server: Server;
	const PORT = 4321;

	before(async function () {
		try {
			server = new Server(PORT);
			await server.start();
			Log.info("Server started successfully");
		} catch (err) {
			Log.error(`Failed to start server: ${err}`);
			throw err;
		}
	});

	after(async function () {
		try {
			await server.stop();
			Log.info("Server stopped successfully");
		} catch (err) {
			Log.error(`Failed to stop server: ${err}`);
			throw err;
		}
	});

	beforeEach(function () {
		Log.info("Starting test case");
	});

	afterEach(function () {
		Log.info("Test case completed");
	});

	describe("PUT endpoints", function () {
		it("should fail to add an improper formatted PUT request (incorrect kind)", async function () {
			const SERVER_URL = `http://localhost:${PORT}`;
			const ENDPOINT_URL = "/dataset/courses/rooms";
			const ZIP_FILE_DATA = await fs.promises.readFile("./test/resources/archives/simplest.zip");

			try {
				const res = await request(SERVER_URL)
					.put(ENDPOINT_URL)
					.send(ZIP_FILE_DATA)
					.set("Content-Type", "application/x-zip-compressed");
				expect(res.status).to.equal(StatusCodes.BAD_REQUEST);
			} catch (err) {
				Log.error(err);
				expect.fail();
			}
		});

		it("should add a courses dataset", async function () {
			const SERVER_URL = `http://localhost:${PORT}`;
			const ENDPOINT_URL = "/dataset/courses/sections";
			const ZIP_FILE_DATA = await fs.promises.readFile("./test/resources/archives/simplest.zip");

			try {
				const res = await request(SERVER_URL)
					.put(ENDPOINT_URL)
					.send(ZIP_FILE_DATA)
					.set("Content-Type", "application/x-zip-compressed");
				expect(res.status).to.equal(StatusCodes.OK);
				expect(res.body.result).to.be.an("array").with.lengthOf(1);
				expect(res.body.result).to.include("courses");
			} catch (err) {
				Log.error(err);
				expect.fail();
			}
		});

		it("should add a rooms dataset", async function () {
			const SERVER_URL = `http://localhost:${PORT}`;
			const ENDPOINT_URL = "/dataset/test/rooms";
			const ZIP_FILE_DATA = await fs.promises.readFile("./test/resources/archives/campus.zip");

			try {
				const res = await request(SERVER_URL)
					.put(ENDPOINT_URL)
					.send(ZIP_FILE_DATA)
					.set("Content-Type", "application/x-zip-compressed");
				expect(res.status).to.equal(StatusCodes.OK);
				expect(res.body.result).to.be.an("array").with.lengthOf(2);
				expect(res.body.result).to.include("test");
			} catch (err) {
				Log.error(err);
				expect.fail();
			}
		});
	});

	describe("POST endpoints", function () {
		it("should fail to query if invalid", async function () {
			const SERVER_URL = `http://localhost:${PORT}`;
			const ENDPOINT_URL = "/query";
			const QUERY_BODY = "not a proper json string";

			try {
				const res = await request(SERVER_URL)
					.post(ENDPOINT_URL)
					.send(QUERY_BODY)
					.set("Content-Type", "application/json");
				expect(res.status).to.equal(StatusCodes.BAD_REQUEST);
			} catch (err) {
				Log.error(err);
				expect.fail();
			}
		});

		it("should query the courses dataset", async function () {
			const SERVER_URL = `http://localhost:${PORT}`;
			const ENDPOINT_URL = "/query";
			const QUERY_BODY = {
				WHERE: {
					IS: {
						courses_dept: "aanb",
					},
				},
				OPTIONS: {
					COLUMNS: ["courses_id", "courses_dept"],
					ORDER: "courses_dept",
				},
			};

			try {
				const res = await request(SERVER_URL)
					.post(ENDPOINT_URL)
					.send(QUERY_BODY)
					.set("Content-Type", "application/json");
				expect(res.status).to.equal(StatusCodes.OK);
				expect(res.body.result).to.deep.equal([
					{
						courses_id: "551",
						courses_dept: "aanb",
					},
					{
						courses_id: "551",
						courses_dept: "aanb",
					},
				]);
			} catch (err) {
				Log.error(err);
				expect.fail();
			}
		});

		it("should query the rooms dataset", async function () {
			const SERVER_URL = `http://localhost:${PORT}`;
			const ENDPOINT_URL = "/query";
			const QUERY_BODY = {
				WHERE: {
					AND: [
						{
							IS: {
								test_furniture: "*Tables*",
							},
						},
						{
							GT: {
								test_seats: 300,
							},
						},
					],
				},
				OPTIONS: {
					COLUMNS: ["test_shortname", "maxSeats"],
					ORDER: {
						dir: "DOWN",
						keys: ["maxSeats"],
					},
				},
				TRANSFORMATIONS: {
					GROUP: ["test_shortname"],
					APPLY: [
						{
							maxSeats: {
								MAX: "test_seats",
							},
						},
					],
				},
			};

			try {
				const res = await request(SERVER_URL)
					.post(ENDPOINT_URL)
					.send(QUERY_BODY)
					.set("Content-Type", "application/json");
				expect(res.status).to.equal(StatusCodes.OK);
				expect(res.body.result).to.deep.equal([
					{
						test_shortname: "OSBO",
						maxSeats: 442,
					},
					{
						test_shortname: "HEBB",
						maxSeats: 375,
					},
					{
						test_shortname: "LSC",
						maxSeats: 350,
					},
				]);
			} catch (err) {
				Log.error(err);
				expect.fail();
			}
		});
	});

	describe("GET endpoints", function () {
		it("should list datasets", async function () {
			const SERVER_URL = `http://localhost:${PORT}`;
			const ENDPOINT_URL = "/datasets";

			try {
				const res = await request(SERVER_URL).get(ENDPOINT_URL);
				expect(res.status).to.equal(StatusCodes.OK);
				expect(res.body.result).to.be.an("array").that.has.lengthOf(2);
				expect(res.body.result).to.deep.include.members([
					{
						id: "courses",
						kind: InsightDatasetKind.Sections,
						numRows: 6,
					},
					{
						id: "test",
						kind: InsightDatasetKind.Rooms,
						numRows: 364,
					},
				]);
			} catch (err) {
				Log.error(err);
				expect.fail();
			}
		});
	});

	describe("DELETE endpoints", function () {
		it("should delete the courses dataset", async function () {
			const SERVER_URL = `http://localhost:${PORT}`;
			const ENDPOINT_URL = "/dataset/courses";

			try {
				const res = await request(SERVER_URL).delete(ENDPOINT_URL);
				expect(res.status).to.equal(StatusCodes.OK);
				expect(res.body.result).to.be.a("string");
				expect(res.body.result).to.equal("courses");
			} catch (err) {
				Log.error(err);
				expect.fail();
			}
		});

		it("should delete the rooms dataset", async function () {
			const SERVER_URL = `http://localhost:${PORT}`;
			const ENDPOINT_URL = "/dataset/test";

			try {
				const res = await request(SERVER_URL).delete(ENDPOINT_URL);
				expect(res.status).to.equal(StatusCodes.OK);
				expect(res.body.result).to.be.a("string");
				expect(res.body.result).to.equal("test");
			} catch (err) {
				Log.error(err);
				expect.fail();
			}
		});

		it("should fail to delete nonexistent rooms dataset", async function () {
			const SERVER_URL = `http://localhost:${PORT}`;
			const ENDPOINT_URL = "/dataset/none";

			try {
				const res = await request(SERVER_URL).delete(ENDPOINT_URL);
				expect(res.status).to.equal(StatusCodes.BAD_REQUEST);
			} catch (err) {
				Log.error(err);
				expect.fail();
			}
		});
	});
});
