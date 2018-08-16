import { Parser } from "./parser";

function startPeriodicTask(name: string, task: ()=>void, seconds: number) {
    console.log("executing: " + name);
    task();
    setInterval(() => {
        console.log("executing: " + name);
        task();
    }, seconds * 1000);
}


let parser = new Parser();
startPeriodicTask("retrieve matches", parser.requestMatches.bind(parser), 10);