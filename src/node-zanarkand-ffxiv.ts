import { ZanarkandFFXIVOptions } from "./models/ZanarkandFFXIVOptions";
import { join } from "path";
import { spawn, ChildProcess } from "child_process";
import { existsSync } from "fs";
import { EventEmitter } from "events";

import WebSocket from "ws";

export class ZanarkandFFXIV extends EventEmitter {
	public filter: string[];
	public log: (line: string) => void;

	private options: ZanarkandFFXIVOptions;
	private childProcess: ChildProcess | undefined;
	private args: string[] | undefined;
	private ws: WebSocket | undefined;

	constructor(options?: ZanarkandFFXIVOptions) {
		super();

		if (!options) options = {};

		this.options = {
			isDev: options.isDev || false,
			networkDevice: options.networkDevice || "localhost",
			port: options.port || 13346,
			region: options.region || "Global",
			// tslint:disable-next-line:no-empty
			logger: options.logger || (() => {}),
			exePath:
				options.exePath ||
				join(__dirname, "..", "ZanarkandWrapper", "ZanarkandWrapperJSON.exe"),
			noExe: options.noExe || false,
		};
		this.log = this.options.logger!;

		if (!this.options.noExe) {
			if (!existsSync(this.options.exePath!)) {
				throw new Error(
					`ZanarkandWrapper not found in ${this.options.exePath}`,
				);
			}

			this.args = [
				"-Region",
				this.options.region!,
				"-Port",
				String(this.options.port),
				"-LocalIP",
				this.options.networkDevice!,
				"-Dev",
				String(this.options.isDev),
			];

			this.log(
				`Starting ZanarkandWrapper from executable ${this.options.exePath!}.`,
			);
			this.launchChild();
		}

		this.filter = [];

		this.connect();
	}

	private launchChild() {
		this.childProcess = spawn(this.options.exePath!, this.args);

		this.childProcess.stdout!.on("data", (chunk) => {
			this.log(chunk);
		});

		this.childProcess.on("error", (err) => {
			this.log(err.message);
		});

		this.childProcess.on("close", (code) => {
			this.log(`ZanarkandWrapper closed with code: ${code}`);
		});
	}

	private connect() {
		this.ws = new WebSocket(
			`ws://${this.options.networkDevice}:${this.options.port}`,
			{
				perMessageDeflate: false,
			},
		);

		this.ws!.on("message", (data) => {
			let content;
			try {
				content = JSON.parse(data.toString());
			} catch (err) {
				this.log(
					`Message parsing threw an error: ${err}\n${
						err.stack
					}\nMessage content:\n${data.toString()}`,
				);
			}
			if (
				this.filter.length === 0 ||
				this.filter.includes(content.type) ||
				this.filter.includes(content.subType) ||
				this.filter.includes(content.superType)
			) {
				this.emit("any", content);
				this.emit(content.packetName, content);
				if (content.superType) this.emit(content.superType, content);
				if (content.subType) this.emit(content.subType, content);
				this.emit("raw", content); // deprecated
			}
		});

		this.ws!.on("open", () => {
			this.log(
				`Connected to ZanarkandWrapper on ${this.options.networkDevice}:${this
					.options.port!}!`,
			);
		});

		this.ws!.on("upgrade", () => {
			this.log("ZanarkandWrapper connection protocol upgraded.");
		});

		this.ws!.on("close", () => {
			this.log("Connection with ZanarkandWrapper closed.");
		});

		this.ws!.on("error", (err) => {
			this.log(
				'Connection errored with message "' +
					err.message +
					'", reconnecting in 1 second...',
			);
			setTimeout(() => this.connect(), 1000);
		});
	}

	async parse(_struct: any) {
		throw new Error("Raw message parsing has not yet been reimplemented.");
	}

	oncePacket(packetName: string): Promise<any> {
		return new Promise((resolve) => this.once(packetName, resolve));
	}

	reset(callback?: (error: Error | null | undefined) => void) {
		return new Promise((resolve, reject) => {
			if (this.options.exePath == null || this.args == null)
				reject(new Error("No instance to reset."));
			this.kill();
			if (!this.options.noExe) {
				this.launchChild();
			}

			this.start(callback);
			this.log("ZanarkandWrapper reset!");
			resolve();
		});
	}

	start(callback?: (error: Error | null | undefined) => void) {
		return new Promise((resolve, reject) => {
			if (this.options.noExe) return; // nop
			if (this.childProcess == null)
				reject(new Error("ZanarkandWrapper is uninitialized."));
			this.childProcess!.stdin!.write("start\n", callback);
			this.log(`ZanarkandWrapper started!`);
			resolve();
		});
	}

	stop(callback?: (error: Error | null | undefined) => void) {
		return new Promise((resolve, reject) => {
			if (this.options.noExe) return; // nop
			if (this.childProcess == null)
				reject(new Error("ZanarkandWrapper is uninitialized."));
			this.childProcess!.stdin!.write("stop\n", callback);
			this.ws!.close(0);
			this.log(`ZanarkandWrapper stopped!`);
			resolve();
		});
	}

	kill(callback?: () => {}) {
		return new Promise((resolve, reject) => {
			if (this.options.noExe) return; // nop
			if (this.childProcess == null)
				reject(new Error("ZanarkandWrapper is uninitialized."));
			this.childProcess!.stdin!.end("kill\n", callback);
			delete this.childProcess;
			this.ws!.close(0);
			this.log(`ZanarkandWrapper killed!`);
		});
	}

	private async sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
