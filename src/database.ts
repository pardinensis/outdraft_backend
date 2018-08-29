import { readFileSync } from "fs";
import { DataPackage } from "./datapackage";
import { Day } from "./day";
import { Hero } from "./hero";

export class Database {
    heroes: {[id: number]: Hero};
    num_ids: number;

    dataPackages: {[dayName: string]: DataPackage};

    constructor() {
        this.dataPackages = {};
        this.heroes = {};
        this.loadHeroes();
    }

    loadHeroes(): void {
        let buffer = readFileSync('./basicHeroes.json', 'utf8');
        let heroList: Hero[] = JSON.parse(buffer);
        let maxHeroId = 0;
        this.heroes = {};
        heroList.forEach(hero => {
            if (hero.id > maxHeroId) {
                maxHeroId = hero.id;
            }
            this.heroes[hero.id] = hero;
        });
        this.num_ids = maxHeroId + 1;
    }

    getPackage(day: Day) : DataPackage {
        let dayName = day.name();
        if (dayName in this.dataPackages === false) {
            this.dataPackages[dayName] = new DataPackage(day, this.heroes);
        }
        return this.dataPackages[dayName];
    }

    saveToDisk(): void {
        for (let dayName in this.dataPackages) {
            let dataPackage = this.dataPackages[dayName];
            if (dataPackage.dirty) {
                dataPackage.writeToFile();
                dataPackage.dirty = false;
            }
        }
    }

}