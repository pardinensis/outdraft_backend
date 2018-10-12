import { existsSync, mkdirSync, writeFileSync } from "fs";
import { Database } from "./database";
import { DataPackage } from "./datapackage";
import { RefinedHero } from "./refinedhero";
import * as Stochastics from "./stochastics";

export class Refiner {
    database: Database;

    constructor(database: Database) {
        this.database = database;
    }

    refine(): void {
        this.database.loadHeroes();
        let refinedHeroes: {[name: string]: RefinedHero} = {};
        for (let heroId in this.database.heroes) {
            let hero = this.database.heroes[heroId];
            let refinedHero = new RefinedHero(this.database);
            refinedHero.id = hero.id;
            refinedHero.name = hero.name;
            refinedHero.internalName = hero.name.toLowerCase().split(" ").join("_").replace("'","");
            refinedHero.attribute = hero.attribute;
            refinedHero.rankedWinRates = hero.rankedWinRates;
            refinedHero.rankedPickRates = hero.rankedPickRates;
            refinedHeroes[refinedHero.name] = refinedHero;
        }

        let meanLifetimeDays = 10;
        let factors: number[] = [];
        let sumOfFactors = 0;
        let dataPackages = DataPackage.loadAll(this.database.heroes);
        for (let i = 0; i < dataPackages.length; ++i) {
            let dataPackage = dataPackages[i];
            let daysPast = dataPackage.day.daysPast();
            let factor = Math.exp(-daysPast / meanLifetimeDays);
            factors[i] = factor;
            sumOfFactors += factor;
        }
        for (let i = 0; i < dataPackages.length; ++i) {
            factors[i] /= sumOfFactors;
        }


        for (let i = 0; i < dataPackages.length; ++i) {
            let dataPackage = dataPackages[i];
            let weightFactor = factors[i];
            for (let heroName in dataPackage.data) {
                let heroData = dataPackage.data[heroName];
                let refinedHero = refinedHeroes[heroName];
                let totalWinRate = heroData.totalGamesWon / heroData.totalGamesPlayed;

                // farm priority
                for (let priority = 0; priority < 5; ++priority) {
                    let nSamples = heroData.gamesPlayedAsFarmPriority[priority];
                    if (nSamples > 50) {
                        let measuredWinRate = heroData.gamesWonAsFarmPriority[priority] / nSamples;
                        let priorityWinRate = Stochastics.split(measuredWinRate, totalWinRate);
                        refinedHero.farmPrioritySamples[priority] += weightFactor * nSamples;
                        refinedHero.farmPriorityWinRates[priority] += weightFactor * nSamples * priorityWinRate;
                    }
                }

                // xp priority
                for (let priority = 0; priority < 5; ++priority) {
                    let nSamples = heroData.gamesPlayedAsXPPriority[priority];
                    if (nSamples > 50) {
                        let measuredWinRate = heroData.gamesWonAsXPPriority[priority] / nSamples;
                        let priorityWinRate = Stochastics.split(measuredWinRate, totalWinRate);
                        refinedHero.xpPrioritySamples[priority] += weightFactor * nSamples;
                        refinedHero.xpPriorityWinRates[priority] += weightFactor * nSamples * priorityWinRate;
                    }
                }

                // synergy
                for (let allyHeroId in this.database.heroes) {
                    let allyHero = this.database.heroes[allyHeroId];
                    let nSamples = heroData.gamesPlayedWith[allyHero.name];
                    if (nSamples > 5) {
                        let allyHeroPackage = dataPackage.data[allyHero.name];
                        let allyWinRate = allyHeroPackage.totalGamesWon / allyHeroPackage.totalGamesPlayed;
                        let expectedWinRate = Stochastics.combine(totalWinRate, allyWinRate);
                        let measuredWinRate = heroData.gamesWonWith[allyHero.name] / nSamples;
                        let synergyWinRate = Stochastics.split(measuredWinRate, expectedWinRate);
                        refinedHero.synergySamples[allyHero.id] += weightFactor * nSamples;
                        refinedHero.synergyWinRates[allyHero.id] += weightFactor * nSamples * synergyWinRate;
                    }
                    else if (nSamples > 0) {
                        console.log(nSamples + ": " + heroName + " + " + allyHero.name + " on " + dataPackage.day.name());
                    }
                }

                // matchup
                for (let enemyHeroId in this.database.heroes) {
                    let enemyHero = this.database.heroes[enemyHeroId];
                    let nSamples = heroData.gamesPlayedAgainst[enemyHero.name];
                    if (nSamples > 5) {
                        let enemyHeroPackage = dataPackage.data[enemyHero.name];
                        let enemyWinRate = enemyHeroPackage.totalGamesWon / enemyHeroPackage.totalGamesPlayed;
                        let expectedWinRate = Stochastics.combine(totalWinRate, 1 - enemyWinRate);
                        let measuredWinRate = heroData.gamesWonAgainst[enemyHero.name] / nSamples;
                        let matchupWinRate = Stochastics.split(measuredWinRate, expectedWinRate);
                        refinedHero.matchUpSamples[enemyHero.id] += weightFactor * nSamples;
                        refinedHero.matchUpWinRates[enemyHero.id] += weightFactor * nSamples * matchupWinRate;
                    }
                }
            }
        }

        for (let heroName in refinedHeroes) {   
            let hero = refinedHeroes[heroName];
            for (let priority = 0; priority < 5; ++priority) {
                hero.farmPriorityWinRates[priority] /= hero.farmPrioritySamples[priority];
                hero.xpPriorityWinRates[priority] /= hero.xpPrioritySamples[priority];
            }
            for (let otherHeroName in refinedHeroes) {
                let otherHero = refinedHeroes[otherHeroName];
                if (hero.id != otherHero.id) {
                    hero.synergyWinRates[otherHero.id] /= hero.synergySamples[otherHero.id];
                    hero.matchUpWinRates[otherHero.id] /= hero.matchUpSamples[otherHero.id];
                }
            }
        }

        for (let heroName in refinedHeroes) {
            let hero = refinedHeroes[heroName];
            let matchUpSum = 0;
            let matchUpNormalization = 0;
            let synergySum = 0;
            let synergyNormalization = 0;
            for (let otherHeroName in refinedHeroes) {
                let otherHero = refinedHeroes[otherHeroName];
                if (otherHero.id !== hero.id) {
                    matchUpSum += Math.abs(hero.matchUpWinRates[otherHero.id] - 0.5) * hero.matchUpSamples[otherHero.id];
                    matchUpNormalization += hero.matchUpSamples[otherHero.id];
                    synergySum += Math.abs(hero.synergyWinRates[otherHero.id] - 0.5) * hero.synergySamples[otherHero.id];
                    synergyNormalization += hero.synergySamples[otherHero.id];
                }
            }
            hero.matchUpSpecifity = matchUpSum / matchUpNormalization;
            hero.synergySpecifity = synergySum / synergyNormalization;
        }

        
        let directory = "refined";
        if (!existsSync(directory)) {
            mkdirSync(directory);
        }
        let heroList: RefinedHero[] = [];
        for (let heroName in refinedHeroes) {   
            heroList.push(refinedHeroes[heroName]);
        }
        writeFileSync(directory + "/heroes.json", JSON.stringify(heroList, null, 2));
    }
}