export class Day {
    date: Date;

    constructor(date: Date) {
        this.date = date;
        this.date.setHours(0);
        this.date.setMinutes(0);
        this.date.setSeconds(0);
        this.date.setMilliseconds(0);
    }

    compareDate(otherDate: Date): number {
        let msPerDay = 24 * 60 * 60 * 1000;
        let ms = this.date.getTime();
        return Math.floor((otherDate.getTime() - this.date.getTime()) / msPerDay);
    }

    name(): string {
        return this.date.getUTCFullYear() + "-" + (this.date.getUTCMonth() + 1) + "-" + (this.date.getUTCDate() + 1);
    }

    daysPast(): number {
        let today = new Date();
        let timeDiffMillis = today.getTime() - this.date.getTime();
        let timeDiffDays = Math.floor(timeDiffMillis / (1000 * 3600 * 24));
        return timeDiffDays;
    }
}