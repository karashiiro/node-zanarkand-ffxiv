export interface BasePacket {
	packetSize?: number;
	opcode: number;
	type: string;
	subType: string;
	superType: string;
	direction: "inbound" | "outbound";
	serverId: number;
	region: "Global" | "KR" | "CN";
	timestamp: number;
	sourceActorId: number;
	targetActorId: number;
	data?: Uint8Array;

	[property: string]: any; // We're not going to type every single packet because that would suck, it's enough of a pain to do it once in Go.
}
