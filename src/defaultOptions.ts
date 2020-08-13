import { join } from "path";
import { ZanarkandFFXIVOptions } from "./models/ZanarkandFFXIVOptions";

const defaultOptions: ZanarkandFFXIVOptions = {
	isDev: false,
	networkDevice: "localhost",
	port: 13346,
	region: "Global",
	// tslint:disable-next-line:no-empty
	logger: () => {},
	executablePath: join(
		__dirname,
		"..",
		"ZanarkandWrapper",
		"ZanarkandWrapperJSON.exe",
	),
	noExe: false,
	dataPath: "",
};

export { defaultOptions };
