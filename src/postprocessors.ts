import { BasePacket } from "node-zanarkand-ffxiv/src/models/BasePacket";

export function postprocessors(): {
	[packetType: string]: (struct: BasePacket) => void;
} {
	return {
		//
	};
}
