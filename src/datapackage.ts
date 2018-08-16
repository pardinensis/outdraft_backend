import { writeFileSync } from "fs";
import { Day } from "./day";
import { Hero } from "./hero";

export class HeroData {
    totalGamesPlayed: number;
    totalGamesWon: number;

    // synergies
    gamesPlayedWith: {[hero: string]: number};
    gamesWonWith: {[hero: string]: number};

    // match-ups
    gamesPlayedAgainst: {[hero: string]: number};
    gamesWonAgainst: {[hero: string]: number};

    // farm priorities (sorted creep score)
    // 0 : hard support (lowest priority)
    // 4 : hard carry (highest priority)
    gamesPlayedAsFarmPriority: {[position: number]: number};
    gamesWonAsFarmPriority: {[position: number]: number};

    // xp priorities (sorted time of lvl 10)
    // 0 : roaming support (lowest priority)
    // 4 : solo lane carry (highest priority)
    gamesPlayedAsXPPriority: {[position: number]: number};
    gamesWonAsXPPriority: {[position: number]: number};

    constructor(heroes: {[id: number]: Hero}) {
        this.totalGamesPlayed = 0;
        this.totalGamesWon = 0;
        this.gamesPlayedWith = {};
        this.gamesWonWith = {};
        this.gamesPlayedAgainst = {};
        this.gamesWonAgainst = {};
        this.gamesPlayedAsFarmPriority = {};
        this.gamesWonAsFarmPriority = {};
        this.gamesPlayedAsXPPriority = {};
        this.gamesWonAsXPPriority = {};
        // for (let heroId in heroes) {
        //     let heroName = heroes[heroId].name;
        //     this.gamesPlayedWith[heroName] = 0;
        //     this.gamesWonWith[heroName] = 0;
        //     this.gamesPlayedAgainst[heroName] = 0;
        //     this.gamesWonAgainst[heroName] = 0;
        // }
        for (let priority = 0; priority < 5; ++priority) {
            this.gamesPlayedAsFarmPriority[priority] = 0;
            this.gamesWonAsFarmPriority[priority] = 0;
            this.gamesPlayedAsXPPriority[priority] = 0;
            this.gamesWonAsXPPriority[priority] = 0;
        }
    }
}

export class DataPackage {
    day: Day;
    dirty: boolean;
    data: {[name: string]: HeroData};

    constructor(day: Day, heroes: {[id: number]: Hero}) {
        this.day = day;
        this.dirty = false;
        this.data = {};
        for (let heroId in heroes) {
            let heroName = heroes[heroId].name;
            this.data[heroName] = new HeroData(heroes);
        }
    }

    writeToFile(): void {
        let filename = this.day.name() + ".json";
        writeFileSync(filename, JSON.stringify(this.data, null, 2));
    }
}