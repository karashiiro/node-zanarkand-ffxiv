# node-zanarkand-ffxiv
A WIP Node.js wrapper for acchan's [Zanarkand](https://github.com/ayyaruq/zanarkand) network capture library.

Event type names and all packet structures are taken from the [Sapphire](https://github.com/SapphireServer/Sapphire) project.

NOTE: Most features besides the `any` data event will break after every patch release until the [IPC opcodes](https://github.com/SapphireServer/Sapphire/blob/develop/src/common/Network/PacketDef/Ipcs.h) are updated in the Sapphire repo.

## Installation
```
npm install node-zanarkand-ffxiv
```

Be sure to also install [Go](https://golang.org/) to build [ZanarkandWrapperJSON](https://github.com/karashiiro/ZanarkandWrapperJSON) and place the output in the ZanarkandWrapper folder.

## Example
```ts
import { ZanarkandFFXIV } from "node-zanarkand-ffxiv"
const Zanarkand = new ZanarkandFFXIV();

Zanarkand.start(async () => {
    console.log("Zanarkand started!");
    await Zanarkand.reset(); // Also promisified!
});

// Assign event handlers
Zanarkand.on('initZone', (content) => {
    console.log(`[${getTime()}]Zone loaded.`);
});

Zanarkand.on('marketBoardItemListing', (content) => {
    var output = "HQ\tMateria\tPrice\tQuantity\tTotal\tCity\t\tRetainer\n";
    for (let i = 0; i < content.prices.length; i++) {
        output += `${content.qualities[i]}\t${content.materiaCounts[i]}\t${content.prices[i]}\t${content.quantities[i]}\t\t${content.totals[i]}\t${content.cities[i] !== "Ul'dah" && content.cities[i] !== "Kugane" && content.cities[i] !== "Ishgard" ? content.cities[i] :
                    (content.cities[i] === "Kugane" ? "Kugane\t" : (content.cities[i] === "Ishgard" ? "Ishgard\t" : "Ul'dah\t"))}\t${content.retainers[i]}\n`;
        if (content.materia[i].length > 0) output += `Materia: ${content.materia[i].toString()}\n`;
    }
    console.log(output);
});
```
