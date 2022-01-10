import {
    Modal,
    App,
    Setting,
    Notice,
    TextComponent,
    DropdownComponent,
    TextAreaComponent,
    TFile
} from "obsidian";
import type { Calendar, Event } from "../../@types";

import { dateString, nanoid } from "../../utils/functions";

import PathSuggestionModal from "../../suggester/path";
import { confirmWithModal } from "./confirm";

export class CreateEventModal extends Modal {
    saved = false;
    event: Event = {
        name: null,
        description: null,
        date: {
            month: null,
            day: null,
            year: null
        },
        id: nanoid(6),
        note: null,
        category: null
    };
    editing: boolean;
    infoEl: HTMLDivElement;
    dateEl: HTMLElement;
    monthEl: HTMLDivElement;
    dayEl: HTMLDivElement;
    yearEl: HTMLDivElement;
    fieldsEl: HTMLDivElement;
    stringEl: HTMLDivElement;
    startDateEl: HTMLDivElement;
    endDateEl: HTMLDivElement;
    startEl: HTMLDivElement;
    endEl: HTMLDivElement;
    constructor(
        app: App,
        public calendar: Calendar,
        event?: Event,
        date?: { month: number; day: number; year: number }
    ) {
        super(app);
        if (event) {
            this.event = { ...event };
            this.editing = true;
        }
        if (date) {
            this.event.date = { ...date };
        }
        this.containerEl.addClass("obsical-create-event");
    }

    async display() {
        this.contentEl.empty();
        this.contentEl.createEl("h3", {
            text: this.editing ? "Edit Event" : "New Event"
        });

        this.infoEl = this.contentEl.createDiv("event-info");
        this.buildInfo();

        this.dateEl = this.contentEl.createDiv("event-date");
        this.buildDate();

        new Setting(this.contentEl)
            .addButton((b) => {
                b.setButtonText("Save")
                    .setCta()
                    .onClick(() => {
                        if (!this.event.name?.length) {
                            new Notice("The event must have a name.");
                            return;
                        }

                        if (this.event.end) {
                            this.event.end = {
                                year:
                                    this.event.end.year ?? this.event.date.year,
                                month:
                                    this.event.end.month ??
                                    this.event.date.month,
                                day: this.event.end.day ?? this.event.date.day
                            };
                            const date = this.event.date;
                            const end = this.event.end;

                            const maxDays = Math.max(
                                ...this.calendar.static.months.map(
                                    (m) => m.length
                                )
                            );

                            // total days per year (does not need to be accurate)
                            const totalDays =
                                maxDays * this.calendar.static.months.length;

                            const dateNumber =
                                (date.year - 1) * totalDays +
                                (date.month ?? -1) * maxDays +
                                date.day;

                            const endNumber =
                                (end.year - 1) * totalDays +
                                (end.month ?? -1) * maxDays +
                                end.day;

                            if (dateNumber > endNumber) {
                                const temp = { ...this.event.end };
                                this.event.end = { ...this.event.date };
                                this.event.date = { ...temp };
                            }
                        }
                        this.saved = true;
                        this.close();
                    });
            })
            .addExtraButton((b) => {
                b.setIcon("cross")
                    .setTooltip("Cancel")
                    .onClick(() => this.close());
            });
    }
    buildDate() {
        this.dateEl.empty();
        this.buildStartDate();

        this.endEl = this.dateEl.createDiv();

        if (!this.event.end) {
            new Setting(this.endEl).setName("Add End Date").addToggle((t) => {
                t.setValue(false).onChange((v) => this.buildEndDate());
            });
        } else {
            this.buildEndDate();
        }

        /* this.buildDateFields(this.endDateEl); */

        this.stringEl = this.dateEl.createDiv(
            "event-date-string setting-item-description"
        );
        this.buildDateString();
    }
    buildStartDate() {
        this.startEl = this.dateEl.createDiv("obsical-event-date");
        this.startEl.createSpan({ text: "Start:" });
        this.startDateEl = this.startEl.createDiv(
            "obsical-date-fields"
        );

        this.buildDateFields(this.startDateEl, this.event.date);
    }
    buildEndDate() {
        this.event.end = this.event.end ?? { ...this.event.date };
        this.endEl.empty();
        this.endEl.addClass("obsical-event-date");
        this.endEl.createSpan({ text: "End:" });
        this.endDateEl = this.endEl.createDiv("obsical-date-fields");

        this.buildDateFields(this.endDateEl, this.event.end);
    }
    buildDateString() {
        this.stringEl.empty();
        this.stringEl.createSpan({
            text: dateString(
                this.event.date,
                this.calendar.static.months,
                this.event.end
            )
        });
    }
    buildDateFields(el: HTMLElement, field = this.event.date) {
        el.empty();
        const dayEl = el.createDiv("obsical-date-field");
        dayEl.createEl("label", { text: "Day" });
        const day = new TextComponent(dayEl)
            .setPlaceholder("Day")
            .setValue(`${field.day}`)
            .onChange((v) => {
                field.day = Number(v);
                this.buildDateString();
            });
        day.inputEl.setAttr("type", "number");

        const monthEl = el.createDiv("obsical-date-field");
        monthEl.createEl("label", { text: "Month" });
        new DropdownComponent(monthEl)
            .addOptions(
                Object.fromEntries([
                    ["select", "Select Month"],
                    ...this.calendar.static.months.map((month) => [
                        month.name,
                        month.name
                    ])
                ])
            )
            .setValue(
                field.month != undefined
                    ? this.calendar.static.months[field.month].name
                    : "select"
            )
            .onChange((v) => {
                if (v === "select") field.month = null;
                const index = this.calendar.static.months.find(
                    (m) => m.name == v
                );
                field.month = this.calendar.static.months.indexOf(index);
                this.buildDateString();
            });

        const yearEl = el.createDiv("obsical-date-field");
        yearEl.createEl("label", { text: "Year" });
        const year = new TextComponent(yearEl)
            .setPlaceholder("Year")
            .setValue(`${field.year}`)
            .onChange((v) => {
                if (!v || v == undefined) {
                    field.year = undefined;
                } else {
                    field.year = Number(v);
                }
                this.buildDateString();
            });
        year.inputEl.setAttr("type", "number");
    }
    buildInfo() {
        this.infoEl.empty();
        new Setting(this.infoEl)
            .setName("Note")
            .setDesc("Link the event to a note.")
            .addText((text) => {
                let files = this.app.vault.getFiles();
                text.setPlaceholder("Path");
                if (this.event.note) {
                    const note = this.app.vault.getAbstractFileByPath(
                        this.event.note
                    );
                    if (note && note instanceof TFile) {
                        text.setValue(note.basename);
                    }
                }

                const modal = new PathSuggestionModal(this.app, text, [
                    ...files
                ]);

                modal.onClose = async () => {
                    text.inputEl.blur();

                    this.event.note = modal.file.path;

                    this.tryParse(modal.file);
                };
            });

        new Setting(this.infoEl).setName("Event Name").addText((t) =>
            t
                .setPlaceholder("Event Name")
                .setValue(this.event.name)
                .onChange((v) => {
                    this.event.name = v;
                })
        );

        const descriptionEl = this.infoEl.createDiv("event-description");
        descriptionEl.createEl("label", { text: "Event Description" });
        new TextAreaComponent(descriptionEl)
            .setPlaceholder("Event Description")
            .setValue(this.event.description)
            .onChange((v) => {
                this.event.description = v;
            });

        new Setting(this.infoEl).setName("Event Category").addDropdown((d) => {
            const options = Object.fromEntries(
                this.calendar.categories.map((category) => {
                    return [category.id, category.name];
                })
            );

            d.addOptions(options)
                .setValue(this.event.category)
                .onChange((v) => (this.event.category = v));
        });
    }
    async tryParse(/* note: string,  */ file: TFile) {
        this.event.name = file.basename;
        const cache = this.app.metadataCache.getFileCache(file);

        const { frontmatter } = cache;
        if (frontmatter) {
            if ("fc-date" in frontmatter) {
                const { day, month, year } = frontmatter["fc-date"];
                if (day) this.event.date.day = day;
                if (month) {
                    if (typeof month === "string") {
                        const indexer =
                            this.calendar.static.months?.find(
                                (m) => m.name == month
                            ) ?? this.calendar.static.months?.[0];
                        this.event.date.month =
                            this.calendar.static.months?.indexOf(indexer);
                    }
                    if (typeof month == "number") {
                        this.event.date.month = month - 1;
                    }
                }
                if (year) this.event.date.year = year;
            }
            if ("fc-category" in frontmatter) {
                if (
                    !this.calendar.categories.find(
                        (c) => c.name === frontmatter["fc-category"]
                    )
                ) {
                    this.calendar.categories.push({
                        name: frontmatter["fantasy-category"],
                        color: "#808080",
                        id: nanoid(6)
                    });
                }
                this.event.category = this.calendar.categories.find(
                    (c) => c.name === frontmatter["fc-category"]
                )?.id;
            }
        }

        await this.display();
    }
    async onOpen() {
        await this.display();
    }
}
