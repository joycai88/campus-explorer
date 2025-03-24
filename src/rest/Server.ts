import express, { Application, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Log } from "@ubccpsc310/project-support";
import * as http from "http";
import cors from "cors";
import InsightFacade from "../controller/InsightFacade";
import { InsightDatasetKind, NotFoundError } from "../controller/IInsightFacade";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	private static insightFacade: InsightFacade;

	constructor(port: number) {
		Log.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();
		Server.insightFacade = new InsightFacade();
		this.registerMiddleware();
		this.registerRoutes();

		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		// this.express.use(express.static("./frontend/public"))
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			Log.info("Server::start() - start");
			if (this.server !== undefined) {
				Log.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express
					.listen(this.port, () => {
						Log.info(`Server::start() - server listening on port: ${this.port}`);
						resolve();
					})
					.on("error", (err: Error) => {
						// catches errors in server start
						Log.error(`Server::start() - server ERROR: ${err.message}`);
						reject(err);
					});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public async stop(): Promise<void> {
		Log.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				Log.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					Log.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware(): void {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({ type: "application/*", limit: "10mb" }));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes(): void {
		// This is an example endpoint this you can invoke by accessing this URL in your browser:
		// http://localhost:4321/echo/hello
		this.express.get("/echo/:msg", Server.echo);

		// TODO: your other endpoints should go here
		this.express.put("/dataset/:id/:kind", Server.addDataset);
		this.express.delete("/dataset/:id", Server.removeDataset);
		this.express.post("/query", Server.performQuery);
		this.express.get("/datasets", Server.listDatasets);
	}

	// The next two methods handle the echo service.
	// These are almost certainly not the best place to put these, but are here for your reference.
	// By updating the Server.echo function pointer above, these methods can be easily moved.
	private static echo(req: Request, res: Response): void {
		try {
			Log.info(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = Server.performEcho(req.params.msg);
			res.status(StatusCodes.OK).json({ result: response });
		} catch (err) {
			res.status(StatusCodes.BAD_REQUEST).json({ error: err });
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}

	// Endpoints:

	private static async addDataset(req: Request, res: Response): Promise<void> {
		Server.checkInsightFacade();
		try {
			Log.info(`Server::addDataset(..) - params: ${JSON.stringify(req.params)}`);
			const id = req.params.id;
			const kindString = req.params.kind;
			let kind: InsightDatasetKind;
			if (kindString === "sections") {
				kind = InsightDatasetKind.Sections;
			} else if (kindString === "rooms") {
				kind = InsightDatasetKind.Rooms;
			} else {
				throw new Error(`Invalid dataset kind: ${req.params.kind}. Must be either 'rooms' or 'sections'.`);
			}

			const content = Buffer.from(req.body).toString("base64");

			const arr = await Server.insightFacade.addDataset(id, content, kind);
			res.status(StatusCodes.OK).json({ result: arr });
		} catch (err) {
			res.status(StatusCodes.BAD_REQUEST).json({ error: err });
		}
	}

	private static async removeDataset(req: Request, res: Response): Promise<void> {
		Server.checkInsightFacade();
		try {
			Log.info(`Server::removeDataset(..) - params: ${JSON.stringify(req.params)}`);
			const id = req.params.id;

			const str = await Server.insightFacade.removeDataset(id);
			res.status(StatusCodes.OK).json({ result: str });
		} catch (err) {
			if (err instanceof NotFoundError) {
				res.status(StatusCodes.NOT_FOUND).json({ error: err });
			} else {
				res.status(StatusCodes.BAD_REQUEST).json({ error: err });
			}
		}
	}

	private static async performQuery(req: Request, res: Response): Promise<void> {
		Server.checkInsightFacade();
		try {
			Log.info(`Server::performQuery(..) - body: ${JSON.stringify(req.body)}`);
			const query = req.body;

			const arr = await Server.insightFacade.performQuery(query);
			res.status(StatusCodes.OK).json({ result: arr });
		} catch (err) {
			res.status(StatusCodes.BAD_REQUEST).json({ error: err });
		}
	}

	private static async listDatasets(req: Request, res: Response): Promise<void> {
		Server.checkInsightFacade();
		try {
			Log.info("Server::listDatasets(..)");
			const arr = await Server.insightFacade.listDatasets();
			res.status(StatusCodes.OK).json({ result: arr });
		} catch (err) {
			Log.info(`Unexpected listDataset failure: ${err}`);
		}
	}

	private static checkInsightFacade(): void {
		if (Server.insightFacade === undefined || Server.insightFacade === null) {
			Server.insightFacade = new InsightFacade();
		}
	}
}
