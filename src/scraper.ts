import * as cheerio from "cheerio";
import * as request from "request-promise-native";
import { Database } from "./database";

export class Scraper {
    GET_META: string = "https://www.dotabuff.com/heroes/meta";

    database: Database;

    constructor(database: Database) {
        this.database = database;
    }

    scrapeMeta() {
        request.get(this.GET_META).then((value: any) => {
            console.log(value);
        });
    }
}
