import { readFileSync } from "fs";
import { Parser } from "./parser";

function startPeriodicTask(name: string, task: ()=>void, seconds: number) {
    console.log("executing: " + name);
    task();
    setInterval(() => {
        console.log("executing: " + name);
        task();
    }, seconds * 1000);
}

let apiKey = readFileSync("./steamapikey.txt", "utf8").trim();
let parser = new Parser(apiKey, 3521000000);
startPeriodicTask("retrieve matches", parser.requestMatches.bind(parser), 10);