import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { existsSync } from "fs";
import defaults from "lodash.defaults";
import WebSocket from "ws";

import { defaultOptions } from "./defaultOptions";
import { postprocessors } from "./postprocessors";

import { BasePacket } from "./models/BasePacket";
import { ZanarkandFFXIVOptions } from "./models/ZanarkandFFXIVOptions";

export class ZanarkandFFXIV extends EventEmitter {
	public packetTypeFilter: string[];
	public log: (line: string) => void;

	private options: ZanarkandFFXIVOptions;
	private childProcess: ChildProcess;
	private args: string[];
	private ws: WebSocket;
	private postprocessorRegistry: {
		[packetType: string]: (struct: BasePacket) => BasePacket;
	};

	constructor(options?: ZanarkandFFXIVOptions) {
		super();

		this.postprocessorRegistry = postprocessors();

		if (!options) options = {};
		this.options = defaults(options, defaultOptions);
		this.options.region = this.options.region ?? "Global";
		this.options.networkDevice = this.options.networkDevice ?? "localhost";

		this.log = this.options.logger!;

		if (!this.options.noExe) {
			if (!existsSync(this.options.executablePath!)) {
				throw new Error(
					`ZanarkandWrapper not found in ${this.options.executablePath}`,
				);
			}

			this.args = [
				"-Region",
				this.options.region,
				"-Port",
				String(this.options.port),
				"-LocalIP",
				this.options.networkDevice,
				"-Dev",
				String(this.options.isDev),
				"-DataPath",
				String(this.options.dataPath).replace(/\\/g, "/"),
			];

			this.log(
				`Starting ZanarkandWrapper from executable ${this.options
					.executablePath!}.`,
			);
			this.launchChild();
		}

		this.packetTypeFilter = [];

		this.connect();
	}

	private launchChild() {
		this.childProcess = spawn(this.options.executablePath!, this.args);

		if (!this.childProcess.stdout)
			throw new Error("Child process failed to start!");

		this.childProcess.stdout
			.on("data", (chunk) => this.log(chunk))
			.on("error", (err) => this.log(err.message))
			.on("close", (code: number) =>
				this.log(`ZanarkandWrapper closed with code: ${code}`),
			);
	}

	private connect() {
		this.ws = new WebSocket(
			`ws://${this.options.networkDevice}:${this.options.port}`,
			{
				perMessageDeflate: false,
			},
		);

		this.ws
			.on("message", (data) => {
				let content: BasePacket;
				try {
					content = JSON.parse(data.toString());
				} catch (err) {
					this.log(
						`Message parsing threw an error: ${err}\n${
							err.stack
						}\nMessage content:\n${data.toString()}`,
					);
					return;
				}
				if (
					this.packetTypeFilter.length === 0 ||
					this.packetTypeFilter.includes(content.type) ||
					this.packetTypeFilter.includes(content.subType) ||
					this.packetTypeFilter.includes(content.superType)
				) {
					// Before this statement, content.data is actually a number[], but we don't want to reveal that to the user
					// since that's not the type that they'll be operating on.
					// Alternatively, it could be sent from ZanarkandWrapper as something called _data which would then be deleted,
					// but I don't want alternative consumers to deal with a cheat that has nothing to do with them.
					if (content.data) {
						content.data = new Uint8Array(content.data);
						content.packetSize = content.data?.length + 32;
					}

					const postprocessor = this.postprocessorRegistry[content.type];
					if (postprocessor) postprocessor(content);

					this.emit("any", content);
					this.emit(content.type, content);
					if (content.superType) this.emit(content.superType, content);
					if (content.subType) this.emit(content.subType, content);
					this.emit("raw", content); // deprecated
				}
			})
			.on("open", () =>
				this.log(
					`Connected to ZanarkandWrapper on ${this.options.networkDevice}:${this
						.options.port!}!`,
				),
			)
			.on("upgrade", () =>
				this.log("ZanarkandWrapper connection protocol upgraded."),
			)
			.on("close", () => this.log("Connection with ZanarkandWrapper closed."))
			.on("error", (err) => {
				this.log(
					`Connection errored with message ${err.message}, reconnecting in 1 second...`,
				);
				setTimeout(() => this.connect(), 1000); // This cannot be reduced since we need to maintain "this" context.
			});
	}

	oncePacket(packetName: string): Promise<any> {
		return new Promise((resolve) => this.once(packetName, resolve));
	}

	filter(packetTypes: string[]) {
		this.packetTypeFilter = packetTypes;
	}

	reset(callback?: (error: Error | undefined) => void) {
		return new Promise((_, reject) => {
			if (this.options.executablePath == null || this.args == null)
				reject(new Error("No instance to reset."));
			this.kill();
			if (!this.options.noExe) {
				this.launchChild();
			}

			this.start(callback);
			this.log("ZanarkandWrapper reset!");
		});
	}

	async start(callback?: (error: Error | undefined) => void) {
		await this.sendMessage("start", callback);
		this.log(`ZanarkandWrapper started!`);
	}

	async stop(callback?: (error: Error | undefined) => void) {
		await this.sendMessage("stop", callback);
		this.ws.close(0);
		this.log(`ZanarkandWrapper stopped!`);
	}

	async kill(callback?: (error: Error | undefined) => void) {
		await this.sendMessage("kill", callback);
		this.ws.close(0);
		this.log(`ZanarkandWrapper killed!`);
	}

	private async sendMessage(
		message: string,
		callback?: (error: Error | undefined) => void,
	) {
		try {
			if (this.options.noExe) return; // nop
			if (!this.childProcess) {
				throw new Error("ZanarkandWrapper is uninitialized.");
			}
			await this.waitForWebSocketReady();
			this.ws.send(message, callback);
		} catch (err) {
			if (callback) callback(err);
			else throw err;
		}
	}

	private async waitForWebSocketReady() {
		while (this.ws.readyState !== 1)
			await new Promise((resolve) => setTimeout(resolve, 1));
		return;
	}
}
