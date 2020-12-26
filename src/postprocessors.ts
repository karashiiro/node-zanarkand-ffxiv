import { BasePacket } from "./models/BasePacket";

export function postprocessors(): {
	[packetType: string]: (struct: BasePacket) => BasePacket;
} {
	return {
		//
	};
}
