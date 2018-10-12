import { Database } from "./database";

export class RefinedHero {
    id: number;
    name: string;
    internalName: string;
    attribute: string;

    rankedPickRates: number[];
    rankedWinRates: number[];
    farmPrioritySamples: number[];
    farmPriorityWinRates: number[];
    xpPrioritySamples: number[];
    xpPriorityWinRates: number[];

    synergySamples: number[];
    synergyWinRates: number[];
    matchUpSamples: number[];
    matchUpWinRates: number[];

    synergySpecifity: number;
    matchUpSpecifity: number;

    constructor(database: Database) {
        this.id = 0;
        this.name = "";
        this.internalName = "";
        this.attribute = "";

        this.rankedPickRates = [0, 0, 0, 0, 0, 0, 0, 0];
        this.rankedWinRates = [0, 0, 0, 0, 0, 0, 0, 0];

        this.farmPrioritySamples = [0, 0, 0, 0, 0];
        this.farmPriorityWinRates = [0, 0, 0, 0, 0];
        this.xpPrioritySamples = [0, 0, 0, 0, 0];
        this.xpPriorityWinRates = [0, 0, 0, 0, 0];

        this.synergySamples = new Array<number>(database.num_ids);
        this.synergyWinRates = new Array<number>(database.num_ids);
        this.matchUpSamples = new Array<number>(database.num_ids);
        this.matchUpWinRates = new Array<number>(database.num_ids);
        for (let id = 0; id < database.num_ids; ++id) {
            this.synergySamples[id] = 0;
            this.synergyWinRates[id] = 0;
            this.matchUpSamples[id] = 0;
            this.matchUpWinRates[id] = 0;
        }

        this.synergySpecifity = 0;
        this.matchUpSpecifity = 0;
    }
}