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
	private childProcess: ChildProcess;
	private args: string[];
	private ws: WebSocket;

	constructor(options?: ZanarkandFFXIVOptions) {
		super();

		if (!options) options = {};

		this.options = {
			isDev: options.isDev || false,
			networkDevice: options.networkDevice || "127.0.0.1",
			port: options.port || 13346,
			region: options.region || "Global",
			// tslint:disable-next-line:no-empty
			logger: options.logger || (() => {}),
			exePath:
				options.exePath ||
				join(__dirname, "..", "ZanarkandWrapper", "ZanarkandWrapperJSON.exe"),
		};
		this.log = this.options.logger!;

		if (!existsSync(this.options.exePath!)) {
			throw new Error(`ZanarkandWrapper not found in ${this.options.exePath}`);
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
		this.childProcess = spawn(this.options.exePath!, this.args);

		this.filter = [];

		this.childProcess.stdout!.on("data", (chunk) => {
			this.log(chunk);
		});

		this.childProcess.on("error", (err) => {
			this.log(err.message);
		});

		this.ws = new WebSocket(
			`ws://${this.options.networkDevice}:${this.options.port}`,
			{
				handshakeTimeout: 5000,
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
			this.childProcess = spawn(this.options.exePath!, this.args);

			this.childProcess.stdout!.on("data", (chunk) => {
				this.log(chunk);
			});

			this.childProcess.on("error", (err) => {
				this.log(err.message);
			});

			this.start(callback);
			this.log("ZanarkandWrapper reset!");
			resolve();
		});
	}

	start(callback?: (error: Error | null | undefined) => void) {
		return new Promise((resolve, reject) => {
			if (this.childProcess == null)
				reject(new Error("ZanarkandWrapper is uninitialized."));
			this.childProcess.stdin!.write("start\n", callback);
			this.log(`ZanarkandWrapper started!`);
			resolve();
		});
	}

	stop(callback?: (error: Error | null | undefined) => void) {
		return new Promise((resolve, reject) => {
			if (this.childProcess == null)
				reject(new Error("ZanarkandWrapper is uninitialized."));
			this.childProcess.stdin!.write("stop\n", callback);
			this.ws.close(0);
			this.log(`ZanarkandWrapper stopped!`);
			resolve();
		});
	}

	kill(callback?: () => {}) {
		return new Promise((resolve, reject) => {
			if (this.childProcess == null)
				reject(new Error("ZanarkandWrapper is uninitialized."));
			this.childProcess.stdin!.end("kill\n", callback);
			delete this.childProcess;
			this.ws.close(0);
			this.log(`ZanarkandWrapper killed!`);
		});
	}
}
