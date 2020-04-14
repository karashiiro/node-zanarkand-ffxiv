import { ZanarkandFFXIVOptions } from "./models/ZanarkandFFXIVOptions"
import { join } from "path"
import { spawn, ChildProcess } from "child_process"
import { existsSync } from "fs"
import { createServer, Server } from "http"
import { EventEmitter } from "events"

export class ZanarkandFFXIV extends EventEmitter {
    public filter: string[]
    public log: (line: string) => void;

    private options: ZanarkandFFXIVOptions
    private childProcess: ChildProcess
    private args: string[]
    private server: Server

    constructor(options: ZanarkandFFXIVOptions) {
        super()

        this.options = {
            isDev: options.isDev || false,
            networkDevice: options.networkDevice || "",
            port: options.port || 13346,
            region: options.region || "Global",
            // tslint:disable-next-line:no-empty
            logger: options.logger || (() => {}),
            exePath: options.exePath || join(__dirname, "..", "ZanarkandWrapper", "ZanarkandWrapperJSON.exe"),
        }
        this.log = this.options.logger!;

        if (!existsSync(this.options.exePath!)) {
            throw new Error(`MachinaWrapper not found in ${this.options.exePath}`);
        }

        this.args = ["-Region", this.options.region!, "-Port", String(this.options.port), "-LocalIP", this.options.networkDevice!, "-Dev", String(this.options.isDev)];
        this.childProcess = spawn(this.options.exePath!, this.args)

        this.filter = [];

        this.childProcess.on("error", (err) => {
            this.log(err.message)
        })

        this.server = createServer((req) => {
            const data: Array<Buffer | string> = []
            req.on("data", (chunk: Buffer | string) => {
                data.push(chunk)
            })
            req.on("end", () => {
                let content
                try {
                    content = JSON.parse(data as any)
                } catch (err) {
                    this.log(`Message parsing threw an error: ${err}\n${err.stack}\nMessage content:\n${data.toString()}`)
                }
                if (this.filter.length === 0 || this.filter.includes(content.type) || this.filter.includes(content.subType) || this.filter.includes(content.superType)) {
                    this.emit("any", content)
                    this.emit(content.packetName, content)
                    this.emit(content.superType, content)
                    this.emit(content.subType, content)
                    this.emit("raw", content) // deprecated
                }
            })
        })
    }

    async parse(_struct: any) {
        throw new Error("Raw message parsing has not yet been reimplemented.")
    }

    oncePacket(packetName: string): Promise<any> {
        return new Promise((resolve) => this.once(packetName, resolve))
    }

    reset(callback?: (error: Error | null | undefined) => void) {
        if (this.options.exePath == null || this.args == null)
            throw new Error("No instance to reset.")
        this.kill()
        this.childProcess = spawn(this.options.exePath!, this.args)
        this.start(callback)
        this.log("ZanarkandWrapper reset!")
    }

    start(callback?: (error: Error | null | undefined) => void) {
        if (this.childProcess == null) throw new Error("ZanarkandWrapper is uninitialized.")
        this.server.listen(this.options.port, () => {
            this.log(`Server started on port ${this.options.port}.`)
        })
        this.childProcess.stdin.write("start\n", callback)
        this.log(`ZanarkandWrapper started!`)
    }

    stop(callback?: (error: Error | null | undefined) => void) {
        if (this.childProcess == null) throw new Error("ZanarkandWrapper is uninitialized.")
        this.childProcess.stdin.write("stop\n", callback)
        this.server.close(() => {
            this.log(`Server on port ${this.options.port} closed.`)
        })
        this.log(`ZanarkandWrapper stopped!`)
    }

    kill(callback?: () => {}) {
        if (this.childProcess == null) throw new Error("ZanarkandWrapper is uninitialized.")
        this.childProcess.stdin.end("kill\n", callback)
        delete this.childProcess
        this.log(`ZanarkandWrapper killed!`)
    }
}