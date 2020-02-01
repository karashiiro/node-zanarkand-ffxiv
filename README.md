# node-zanarkand-ffxiv
A WIP Node.js wrapper for acchan's [Zanarkand](https://github.com/ayyaruq/zanarkand) network capture library.

Many features are unimplemented, and chat-related messages aren't completely working, but besides that what is implemented is probably usable.

If you so choose, you can use it exclusively as a wrapper for Zanarkand with minimal data processing by assigning the `raw` data event as shown below.

Event type names and all packet structures are taken from the [Sapphire](https://github.com/SapphireServer/Sapphire) project.

NOTE: Most features besides the `raw` data event will break after every patch release until the [IPC opcodes](https://github.com/SapphireServer/Sapphire/blob/develop/src/common/Network/PacketDef/Ipcs.h) are updated in the Sapphire repo.

## Installation
```
npm install node-zanarkand-ffxiv
```

Be sure to also install [Go](https://golang.org/) to build [ZanarkandWrapperJSON](https://github.com/karashiiro/ZanarkandWrapperJSON) and place the output in the ZanarkandWrapper folder.

## Example
```
const ZanarkandFFXIV = require('node-zanarkand-ffxiv');
const Zanarkand = new ZanarkandFFXIV();
Zanarkand.start(() => {
    console.log("Zanarkand started!");
});

// Assign event handlers
Zanarkand.on('cFCommence', (content) => {
    console.log(`[${getTime()}]Duty commenced!`);
});

Zanarkand.on('cFRegistered', (content) => {
    console.log(`[${getTime()}]Duty registration complete.`);
});

Zanarkand.on('examineSearchInfo', (content) => {
    console.log(`Viewing search info.
        FC: ${content.fc}
        Search Comment: ${content.searchComment}
        World: ${content.world}
    `);
});

Zanarkand.on('freeCompanyMemberLogin', (content) => {
    console.log(`[${getTime()}][FC]${content.character} has logged in.`);
});

Zanarkand.on('freeCompanyMemberLogout', (content) => {
    console.log(`[${getTime()}][FC]${content.character} has logged out.`);
});

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

Zanarkand.on('message', (content) => { // Using a supertype event to streamline code
    console.log(`[${getTime()}][${content.type.slice(7)}]<${content.character}> ${content.message}`);
});
```
