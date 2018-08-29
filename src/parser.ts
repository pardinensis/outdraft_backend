import { readFileSync, writeFileSync } from "fs";
import * as RequestAPI from "request-promise-native";
import { Day } from "./day";
import { Database } from "./database";
import { DataPackage } from "./datapackage";


export class Parser {
    GET_HEROES: string = "https://api.steampowered.com/IEconDOTA2_570/GetHeroes/v1/?";
    GET_MATCHES: string = "https://api.steampowered.com/IDOTA2Match_570/GetMatchHistoryBySequenceNum/v1/?";
    
    database : Database;
    currentMatchSeqNum : number;
    steamAPIKey: string;

    constructor(database: Database) {
        this.database = database;
        this.steamAPIKey = readFileSync("./steamapikey.txt", "utf8").trim();
        this.currentMatchSeqNum = parseInt(readFileSync("./matchseqnum.txt", "utf8"));
    }

    saveMatchSeqNum(): void {
        try {
            writeFileSync("./matchseqnum.txt", "" + this.currentMatchSeqNum);
        }
        catch (err) {
            console.log("ERROR WRITING FILE: " + err);
        }
    }

    isValid(match: any): boolean {
        // check number of players that have picked heroes
        if (match.players.length != 10) {
            return false;
        }
        for (let i = 0; i < 10; ++i) {
            if (!(match.players[i].hero_id > 0)) {
                return false;
            }
        }

        // check leaver status
        for (let i = 0; i < 10; ++i) {
            if (match.players[i].leaver_status != 0) {
                return false;
            }
        }

        // check game length
        if (match.duration < 600) {
            return false;
        }
        
        // check if lobby type is ranked
        if (match.lobby_type != 7) {
            return false;
        }

        return true;
    }

    parseWinRate(match: any, dataPackage: DataPackage) {
        for (let teamIdx = 0; teamIdx < 2; ++teamIdx) {
            let won = match.radiant_win == (teamIdx === 0);
            for (let playerIdx = 0; playerIdx < 5; ++playerIdx) {
                let player = match.players[teamIdx * 5 + playerIdx];
                let heroId = player.hero_id;
                let hero = this.database.heroes[heroId];
                let heroData = dataPackage.data[hero.name];
                heroData.totalGamesPlayed++;
                if (won) {
                    heroData.totalGamesWon++;
                }
            }
        }
    }

    parseFarmPriorities(match: any, dataPackage: DataPackage) {
        for (let teamIdx = 0; teamIdx < 2; ++teamIdx) {
            let won = match.radiant_win == (teamIdx === 0);
            let farm: [number, number][] = [];
            for (let playerIdx = 0; playerIdx < 5; ++playerIdx) {
                let player = match.players[teamIdx * 5 + playerIdx];
                farm.push([player.last_hits, player.hero_id]);
            }
            farm.sort((a: [number, number], b: [number, number]) => {
                return a[0] - b[0];
            });
            for (let farmIdx = 0; farmIdx < 5; ++farmIdx) {
                let heroId = farm[farmIdx][1];
                let hero = this.database.heroes[heroId];
                let heroData = dataPackage.data[hero.name];
                heroData.gamesPlayedAsFarmPriority[farmIdx]++;
                if (won) {
                    heroData.gamesWonAsFarmPriority[farmIdx]++;
                }
            }
        }
    }

    parseXPPriorities(match: any, dataPackage: DataPackage) {
        let levelYardstick = 10;
        for (let teamIdx = 0; teamIdx < 2; ++teamIdx) {
            let won = match.radiant_win == (teamIdx === 0);
            let xp: [number, number][] = [];
            for (let playerIdx = 0; playerIdx < 5; ++playerIdx) {
                let player = match.players[teamIdx * 5 + playerIdx];
                let upgrades: any[] = player.ability_upgrades;
                if (typeof upgrades === "undefined" || upgrades.length < levelYardstick) {
                    return; // not everyone got the desired level
                }
                let upgradeTime = upgrades[levelYardstick - 1].time;
                xp.push([upgradeTime, player.hero_id]);
            }
            xp.sort((a: [number, number], b: [number, number]) => {
                return b[0] - a[0];
            });
            for (let xpIdx = 0; xpIdx < 5; ++xpIdx) {
                let heroId = xp[xpIdx][1];
                let hero = this.database.heroes[heroId];
                let heroData = dataPackage.data[hero.name];
                heroData.gamesPlayedAsXPPriority[xpIdx]++;
                if (won) {
                    heroData.gamesWonAsXPPriority[xpIdx]++;
                }
            }
        }
    }

    parseSynergies(match: any, dataPackage: DataPackage) {
        for (let teamIdx = 0; teamIdx < 2; ++teamIdx) {
            let won = match.radiant_win == (teamIdx === 0);
            for (let playerIdx1 = 0; playerIdx1 < 5; ++playerIdx1) {
                let player1 = match.players[teamIdx * 5 + playerIdx1];
                let hero1 = this.database.heroes[player1.hero_id];
                let heroData = dataPackage.data[hero1.name];
                for (let playerIdx2 = 0; playerIdx2 < 5; ++playerIdx2) {
                    if (playerIdx1 != playerIdx2) {
                        let player2 = match.players[teamIdx * 5 + playerIdx2];
                        let hero2 = this.database.heroes[player2.hero_id];
                        heroData.gamesPlayedWith[hero2.name]++;
                        if (won) {
                            heroData.gamesWonWith[hero2.name]++;
                        }
                    }
                }
            }
        }
    }

    parseMatchUps(match: any, dataPackage: DataPackage) {
        for (let teamIdx = 0; teamIdx < 2; ++teamIdx) {
            let won = match.radiant_win == (teamIdx === 0);
            for (let playerIdx1 = 0; playerIdx1 < 5; ++playerIdx1) {
                let player1 = match.players[teamIdx * 5 + playerIdx1];
                let hero1 = this.database.heroes[player1.hero_id];
                let heroData = dataPackage.data[hero1.name];
                for (let playerIdx2 = 0; playerIdx2 < 5; ++playerIdx2) {
                    let player2 = match.players[(1 - teamIdx) * 5 + playerIdx2];
                    let hero2 = this.database.heroes[player2.hero_id];
                    heroData.gamesPlayedAgainst[hero2.name]++;
                    if (won) {
                        heroData.gamesWonAgainst[hero2.name]++;
                    }
                }
            }
        }
    }

    parseMatch(match: any): Day {
        let day = new Day(new Date(match.start_time * 1000));
        let dataPackage = this.database.getPackage(day);
        dataPackage.dirty = true;

        this.parseWinRate(match, dataPackage);
        this.parseFarmPriorities(match, dataPackage);
        this.parseXPPriorities(match, dataPackage);
        this.parseSynergies(match, dataPackage);
        this.parseMatchUps(match, dataPackage);

        return day;
    }


    parseMatches(data: any): void {
        if (data.result === undefined) {
            console.log(data);
        }
        let matchArray: any[] = data.result.matches;
        console.log(matchArray.length);
        matchArray.forEach(match => {
            if (this.isValid(match)) {
                this.parseMatch(match);
            }

            if (match.match_seq_num !== undefined) {
                this.currentMatchSeqNum = match.match_seq_num + 1;
            }
        });

        this.database.saveToDisk();
        this.saveMatchSeqNum();
    }

    requestURI(uri: string, dataSink: (data: any) => void) : void {
        RequestAPI.get(uri, {}, () => {
        }).then((value: any) => {
            let statusCode = 200;
            switch(statusCode) {
                case 200: // ok
                    dataSink(JSON.parse(value));
                    break;
                case 503:
                    console.log("API unavailable");
                    break;
                default:
                    console.log("unhandled status code: " + statusCode);
            }
        }, (reason: any) => {
            console.log("REJECTED: " + reason);
        });
    }

    requestMatches(): void {
        let uri = this.GET_MATCHES + "key=" + this.steamAPIKey + "&matches_requested=100&start_at_match_seq_num=" + this.currentMatchSeqNum + "L";
        this.requestURI(uri, this.parseMatches.bind(this));
    }

    requestHeroes(): void {
        let uri = this.GET_HEROES + "key=" + this.steamAPIKey;
        this.requestURI(uri, data => {
            data.result.heroes.forEach((h: any) => console.log(h));
        });
    }
}