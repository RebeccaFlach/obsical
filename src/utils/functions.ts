import type { CurrentCalendarData, LeapDay, Month, Event } from "../@types";
import dayjs from "dayjs";
import { App, normalizePath } from "obsidian";

export function daysBetween(date1: Date, date2: Date) {
    const d1 = window.moment(date1);
    const d2 = window.moment(date2);

    let days = d2.diff(d1, "days");

    if (
        (d1.year() < d2.year() || d1.dayOfYear() < d2.dayOfYear()) &&
        (d1.hour() > d2.hour() ||
            d1.minute() > d2.minute() ||
            d1.second() > d2.second() ||
            d1.millisecond() > d2.millisecond())
    ) {
        days += 1;
    }
    return days;
}

export function wrap(value: number, size: number): number {
    return ((value % size) + size) % size;
}

export function nanoid(len: number) {
    return "ID_xyxyxyxyxyxy".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export function createNote(name: string, app: App, data:Event): string {
    const note = normalizePath(`${name}.md`);
    const date = dayjs(data.date);
    const dateFormat = 'dddd, MMMM D YYYY ';
    const timeFormat = 'h:mm a'
    const end = dayjs(data.end);
    // const formattedDate = date.format(data.allDay ? "YYYY-MM-DD" : "YYYY-MM-DD")
    let formattedDate;
    // allDay dates never hold time, so an end date can/should only occur if the allDay date spans multiple days
    if (data.allDay) {
        // Reminder: ## is for a header in markdown
        formattedDate = `## ${date.format(dateFormat)}`;
        if (data.end)
            formattedDate += (' - ' + end.format(dateFormat));
    } 
    else {
        if (data.end){
            if (date.isSame(end, 'day'))
                // End date is start date? Date only needed once, put time in a lower-level heading
                formattedDate = `## ${date.format(dateFormat)} \n ### ${date.format(timeFormat)} - ${end.format(timeFormat)}`;
            else 
                // Different start and end dates but not all day? Prioritize both time and date in the heading
                formattedDate = `## ${date.format(dateFormat + timeFormat)} - ${end.format(dateFormat + timeFormat)}`;
        }
        else 
            // No end date and time? Prioritize date and put time in lower-level heading
            formattedDate = `## ${date.format(dateFormat)} \n ### ${date.format(timeFormat)}`
    }
    // all day: DATE - DATE
    // time, same day
    app.vault.create(
        note,
        `
---
event-start: ${data.date}
event-end: ${data.end}
---

# ${data.name}

${formattedDate}

${data.description || ''}`
    )

    return note; 
}

export function getIntervalDescription(leapday: LeapDay) {
    if (!leapday.interval?.length) return "";
    const intervals = leapday.interval.sort((a, b) => a.interval - b.interval);
    let description = [];
    for (let interval of intervals) {
        const length =
            interval.interval + (interval.ignore ? 0 : leapday.offset);
        if (interval.exclusive) {
            description.push(`not every ${ordinal(length)} year`);
        } else {
            const index = intervals.indexOf(interval);
            const also = index > 0 && intervals[index - 1].exclusive;
            description.push(
                `${also ? "also " : ""}every ${ordinal(length)} year`
            );
        }
    }
    const join = description.join(", but ");
    return join[0].toUpperCase() + join.slice(1).toLowerCase();
}

export function ordinal(i: number) {
    const j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return i + "st";
    }
    if (j == 2 && k != 12) {
        return i + "nd";
    }
    if (j == 3 && k != 13) {
        return i + "rd";
    }
    return i + "th";
}
export function dateString(
    date: Date,
    months: Month[],
    end?: Date
) {
    if (!date) {
        return "";
    }

   return dayjs(date).toString(); //TODO format nicely
}
function LeapDay(leapday: any, LeapDay: any) {
    throw new Error("Function not implemented.");
}
