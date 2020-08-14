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
	private postprocessorRegistry: {
		[packetType: string]: (struct: BasePacket) => void;
	};

	private options: ZanarkandFFXIVOptions;
	private childProcess: ChildProcess;
	private args: string[];
	private ws: WebSocket;

	constructor(options?: ZanarkandFFXIVOptions) {
		super();

		this.postprocessorRegistry = postprocessors();

		if (!options) options = {};
		this.options = defaults(options, defaultOptions);

		this.log = this.options.logger!;

		if (!this.options.noExe) {
			if (!existsSync(this.options.executablePath!)) {
				throw new Error(
					`ZanarkandWrapper not found in ${this.options.executablePath}`,
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
				"-DataPath",
				String(this.options.dataPath),
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
					if (content.data) content.data = new Uint8Array(content.data);

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

	async parse(_struct: any) {
		throw new Error("Raw message parsing has not yet been reimplemented.");
	}

	oncePacket(packetName: string): Promise<any> {
		return new Promise((resolve) => this.once(packetName, resolve));
	}

	filter(packetTypes: string[]) {
		this.packetTypeFilter = packetTypes;
	}

	reset(callback?: (error: Error | null | undefined) => void) {
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

	start(callback?: (error: Error | null | undefined) => void) {
		return new Promise((_, reject) => {
			if (this.options.noExe) return; // nop
			if (!this.childProcess) {
				reject(new Error("ZanarkandWrapper is uninitialized."));
				return;
			}
			this.childProcess.stdin!.write("start\n", callback);
			this.log(`ZanarkandWrapper started!`);
		});
	}

	stop(callback?: (error: Error | null | undefined) => void) {
		return new Promise((_, reject) => {
			if (this.options.noExe) return; // nop
			if (!this.childProcess) {
				reject(new Error("ZanarkandWrapper is uninitialized."));
				return;
			}
			this.childProcess.stdin!.write("stop\n", callback);
			this.ws.close(0);
			this.log(`ZanarkandWrapper stopped!`);
		});
	}

	kill(callback?: () => {}) {
		return new Promise((resolve, reject) => {
			if (this.options.noExe) return; // nop
			if (!this.childProcess) {
				reject(new Error("ZanarkandWrapper is uninitialized."));
				return;
			}
			this.childProcess.stdin!.end("kill\n", callback);
			delete this.childProcess;
			this.ws.close(0);
			this.log(`ZanarkandWrapper killed!`);
		});
	}
}
