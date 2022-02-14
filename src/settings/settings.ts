import {
    addIcon,
    ButtonComponent,
    DropdownComponent,
    ExtraButtonComponent,
    Modal,
    normalizePath,
    Notice,
    PluginSettingTab,
    setIcon,
    Setting,
    TextAreaComponent,
    TextComponent,
    TFolder
} from "obsidian";

import { google } from "googleapis";

import copy from "fast-copy";

import { DEFAULT_CALENDAR } from "../main";
import type FantasyCalendar from "../main";
import Importer from "./import/importer";
import { PRESET_CALENDARS } from "../utils/presets";

import Weekdays from "./ui/Weekdays.svelte";
import Months from "./ui/Months.svelte";
import EventsUI from "./ui/Events.svelte";
import Categories from "./ui/Categories.svelte";
import Year from "./ui/Year.svelte";

import "./settings.css";
import { nanoid } from "src/utils/functions";
import type {
    Calendar,
    Event,
    EventCategory,
    LeapDay,
    Year as YearType
} from "src/@types";

import { CreateEventModal } from "./modals/event";
import { confirmWithModal } from "./modals/confirm";

import LeapDays from "./ui/LeapDays.svelte";
import { CreateLeapDayModal } from "./modals/leapday";
import { FolderSuggestionModal } from "src/suggester/folder";

export enum Recurring {
    none = "None",
    monthly = "Monthly",
    yearly = "Yearly"
}

declare module "obsidian" {
    interface App {
        internalPlugins: {
            getPluginById(id: "daily-notes"): {
                _loaded: boolean;
                instance: {
                    options: {
                        format: string;
                    };
                };
            };
        };
    }
}

addIcon(
    "obsical-grip",
    `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="grip-lines" class="svg-inline--fa fa-grip-lines fa-w-16" role="img" viewBox="0 0 512 512"><path fill="currentColor" d="M496 288H16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h480c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zm0-128H16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h480c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16z"/></svg>`
);

addIcon(
    "obsical-warning",
    `<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="exclamation-triangle" class="svg-inline--fa fa-exclamation-triangle fa-w-18" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M569.517 440.013C587.975 472.007 564.806 512 527.94 512H48.054c-36.937 0-59.999-40.055-41.577-71.987L246.423 23.985c18.467-32.009 64.72-31.951 83.154 0l239.94 416.028zM288 354c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z"></path></svg>`
);

export default class FantasyCalendarSettings extends PluginSettingTab {
    calendarUI: HTMLDivElement;
    infoEl: HTMLDivElement;
    get data() {
        return this.plugin.data;
    }
    constructor(public plugin: FantasyCalendar) {
        super(plugin.app, plugin);
    }
    async display() {
        this.containerEl.empty();
        this.containerEl.createEl("h2", { text: "Fantasy Calendars" });
        this.containerEl.addClass("obsical-settings");

        this.infoEl = this.containerEl.createDiv();
        this.buildInfo();

        const importSetting = new Setting(this.containerEl)
            .setName("Import Calendar")
            .setDesc("Import calendar from ");
        importSetting.descEl.createEl("a", {
            href: "https://app.obsical.com",
            text: "Fantasy Calendar",
            cls: "external-link"
        });
        const input = createEl("input", {
            attr: {
                type: "file",
                name: "merge",
                accept: ".json",
                multiple: true,
                style: "display: none;"
            }
        });
        input.onchange = async () => {
            const { files } = input;

            if (!files.length) return;
            try {
                const data = [];
                for (let file of Array.from(files)) {
                    data.push(JSON.parse(await file.text()));
                }
                const calendars = Importer.import(data);
                this.plugin.data.calendars.push(...calendars);
                await this.plugin.saveCalendar();
                this.buildCalendarUI();
            } catch (e) {
                new Notice(
                    `There was an error while importing the calendar${
                        files.length == 1 ? "" : "s"
                    }.`
                );
                console.error(e);
            }

            input.value = null;
        };
        importSetting.addButton((b) => {
            b.setButtonText("Choose Files");
            b.buttonEl.addClass("calendar-file-upload");
            b.buttonEl.appendChild(input);
            b.onClick(() => input.click());
        });

        this.calendarUI = this.containerEl.createDiv("obsicals");

        this.buildCalendarUI();
    }
    buildInfo() {
        this.infoEl.empty();


        let code:string = '';
        

        const oauth2Client = new google.auth.OAuth2(
            CLIENT_ID,
            CLIENT_SECRET,
            'urn:ietf:wg:oauth:2.0:oob' //copy paste instead of callback url
        );

        oauth2Client.setCredentials(JSON.parse(window.localStorage.getItem('tokens')));

        function listEvents() {
            console.log('listing events')
            const calendar = google.calendar({version: 'v3', auth: oauth2Client});
            calendar.events.list({
              calendarId: 'primary',
              timeMin: (new Date()).toISOString(),
              maxResults: 10,
              singleEvents: true,
              orderBy: 'startTime',
            }, (err, res) => {
              if (err) return console.log('The API returned an error: ' + err);
              const events = res.data.items;
              if (events.length) {
                console.log('Upcoming 10 events:');
                events.map((event, i) => {
                  console.log(event);
                });
              } else {
                console.log('No upcoming events found.');
              }
            });
          }

        const handleAuthClick = async (event:any) => {
            const url = oauth2Client.generateAuthUrl({
                // 'online' (default) or 'offline' (gets refresh_token)
                access_type: 'offline',
                scope: 'https://www.googleapis.com/auth/calendar'
            });
            console.log('login url')
            console.log(url);
            window.location.assign(url);
            
            // const {tokens} = await oauth2Client.getToken(code)
            // oauth2Client.setCredentials(tokens);
        }

        const login = () => {
            console.log(code);
            
            oauth2Client.getToken(code).then(({tokens}) => {
                console.log(tokens)
                oauth2Client.setCredentials(tokens);
                window.localStorage.setItem('tokens', JSON.stringify(tokens));
                listEvents();
            })
        }

       
        new Setting(this.infoEl)
            .setName("Google Calendar")
            .setDesc("The plugin will sync with Google Calendar.")
            .addButton((b) => {
                b.setButtonText("Sign In");
                b.onClick((e) => {console.log("test"); handleAuthClick(e)});
            })
            .addText((t) => {
                t.setValue(code).onChange(
                    (v) => (code = v)
                );
            })
            .addExtraButton((b) => {
                b.setIcon("pencil").onClick(login)
            })
            // .addInput()
        new Setting(this.infoEl)
            .setName('Fetch Test')
            .addButton((b) => {
                b.setButtonText('fetch');
                b.onClick(() => {listEvents()})
            })
    
    
        new Setting(this.infoEl)
            .setName("Default Calendar to Open")
            .setDesc("Views will open to this calendar by default.")
            .addDropdown((d) => {
                d.addOption("none", "None");
                for (let calendar of this.data.calendars) {
                    d.addOption(calendar.id, calendar.name);
                }
                d.setValue(this.plugin.data.defaultCalendar);
                d.onChange((v) => {
                    if (v === "none") {
                        this.plugin.data.defaultCalendar = null;
                        this.plugin.saveSettings();
                        return;
                    }

                    this.plugin.data.defaultCalendar = v;
                    this.plugin.saveSettings();
                });
            });

        new Setting(this.infoEl)
            .setName("Display Event Previews")
            .setDesc(
                "Use the core Note Preview plugin to display event notes when hovered."
            )
            .addToggle((t) => {
                t.setValue(this.data.eventPreview).onChange((v) => {
                    this.data.eventPreview = v;
                    this.plugin.saveSettings();
                });
            });
        new Setting(this.infoEl)
            .setName("Parse Note Titles for Dates")
            .setDesc("The plugin will parse note titles for event dates.")
            .addToggle((t) => {
                t.setValue(this.data.parseDates).onChange((v) => {
                    this.data.parseDates = v;
                    this.plugin.saveSettings();
                });
            });
        new Setting(this.infoEl)
            .setName("Date format")
            .setClass(this.data.dailyNotes ? "daily-notes" : "no-daily-notes")
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: "Dates will be parsed per this format."
                    });
                    e.createEl("br");
                    e.createSpan({ text: "Dates must include the " });
                    e.createEl("strong", { text: "full " });
                    e.createSpan({ text: "year." });
                })
            )
            .addText((t) => {
                t.setDisabled(this.data.dailyNotes)
                    .setValue(this.plugin.format)
                    .onChange((v) => {
                        this.data.dateFormat = v;
                        this.plugin.saveSettings();
                    });
            })
            .addExtraButton((b) => {
                if (this.data.dailyNotes) {
                    b.setIcon("checkmark")
                        .setTooltip("Unlink from Daily Notes")
                        .onClick(() => {
                            this.data.dailyNotes = false;
                            this.buildInfo();
                        });
                } else {
                    b.setIcon("paper-plane-glyph")
                        .setTooltip("Link with Daily Notes")
                        .onClick(() => {
                            this.data.dailyNotes = true;
                            this.buildInfo();
                        });
                }
            });

        new Setting(this.infoEl)
            .setName("Folder to Watch")
            .setDesc("The plugin will only watch for changes in this folder.")
            .addText((text) => {
                let folders = this.app.vault
                    .getAllLoadedFiles()
                    .filter((f) => f instanceof TFolder);

                text.setPlaceholder(this.plugin.data.path ?? "/");
                const modal = new FolderSuggestionModal(this.app, text, [
                    ...(folders as TFolder[])
                ]);

                modal.onClose = async () => {
                    const v = text.inputEl.value?.trim()
                        ? text.inputEl.value.trim()
                        : "/";
                    this.plugin.data.path = normalizePath(v);
                };

                text.inputEl.onblur = async () => {
                    const v = text.inputEl.value?.trim()
                        ? text.inputEl.value.trim()
                        : "/";
                    this.plugin.data.path = normalizePath(v);
                };
            });

        new Setting(this.infoEl)
            .setClass("obsical-config")
            .setName(
                createFragment((e) => {
                    setIcon(e.createSpan(), "obsical-warning");
                    e.createSpan({ text: "Default Config Directory" });
                })
            )
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: "Please back up your data before changing this setting. Hidden directories must be manually entered."
                    });
                    e.createEl("br");
                    e.createSpan({
                        text: `Current directory: `
                    });
                    const configDirectory =
                        this.data.configDirectory ?? this.app.vault.configDir;
                    e.createEl("code", {
                        text: configDirectory
                    });
                })
            )
            .addText(async (text) => {
                let folders = this.app.vault
                    .getAllLoadedFiles()
                    .filter((f) => f instanceof TFolder);

                text.setPlaceholder(
                    this.data.configDirectory ?? this.app.vault.configDir
                );
                const modal = new FolderSuggestionModal(this.app, text, [
                    ...(folders as TFolder[])
                ]);

                modal.onClose = async () => {
                    if (!text.inputEl.value) {
                        this.data.configDirectory = null;
                    } else {
                        const exists = await this.app.vault.adapter.exists(
                            text.inputEl.value
                        );

                        if (!exists) {
                            this.data.configDirectory = text.inputEl.value;
                            await this.plugin.saveSettings();
                        }
                    }
                };

                text.inputEl.onblur = async () => {
                    if (!text.inputEl.value) {
                        return;
                    }
                    const exists = await this.app.vault.adapter.exists(
                        text.inputEl.value
                    );

                    this.data.configDirectory = text.inputEl.value;

                    await this.plugin.saveSettings();
                    this.display();
                };
            })
            .addExtraButton((b) => {
                b.setTooltip("Reset to Default")
                    .setIcon("undo-glyph")
                    .onClick(async () => {
                        this.data.configDirectory = null;
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });
    }
    buildCalendarUI() {
        this.calendarUI.empty();

        new Setting(this.calendarUI)
            .setHeading()
            .setName("Add New Calendar")
            .addButton((button: ButtonComponent) =>
                button
                    .setTooltip("Add Calendar")
                    .setButtonText("+")
                    .onClick(() => {
                        const modal = new CreateCalendarModal(this.plugin);
                        modal.onClose = async () => {
                            if (!modal.saved) return;
                            const calendar = copy(modal.calendar);
                            if (!calendar.current.year) {
                                calendar.current.year = 1;
                            }
                            await this.plugin.addNewCalendar(calendar);

                            this.showCalendars(existing);
                        };
                        modal.open();
                    })
            );

        const existing = this.calendarUI.createDiv("existing-calendars");

        this.showCalendars(existing);
    }
    showCalendars(element: HTMLElement) {
        element.empty();
        if (!this.data.calendars.length) {
            element.createSpan({
                text: "No calendars created! Create a calendar to see it here."
            });
            return;
        }
        for (let calendar of this.data.calendars) {
            new Setting(element)
                .setName(calendar.name)
                .setDesc(calendar.description ?? "")
                .addExtraButton((b) => {
                    b.setIcon("pencil").onClick(() => {
                        const modal = new CreateCalendarModal(
                            this.plugin,
                            calendar
                        );
                        modal.onClose = async () => {
                            if (!modal.saved) {
                                this.showCalendars(element);
                                return;
                            }
                            this.data.calendars.splice(
                                this.data.calendars.indexOf(calendar),
                                1,
                                copy(modal.calendar)
                            );

                            await this.plugin.saveCalendar();

                            this.showCalendars(element);
                        };
                        modal.open();
                    });
                })
                .addExtraButton((b) => {
                    b.setIcon("trash").onClick(async () => {
                        if (
                            !(await confirmWithModal(
                                this.app,
                                "Are you sure you want to delete this calendar?",
                                {
                                    cta: "Delete",
                                    secondary: "Cancel"
                                }
                            ))
                        )
                            return;
                        this.plugin.data.calendars =
                            this.plugin.data.calendars.filter(
                                (c) => c.id != calendar.id
                            );
                        await this.plugin.saveCalendar();

                        this.buildInfo();
                        this.showCalendars(element);
                    });
                });
        }
    }
}

class CreateCalendarModal extends Modal {
    calendar: Calendar = { ...DEFAULT_CALENDAR };
    saved: boolean = false;
    editing: boolean = false;
    weekdayEl: any;
    monthEl: HTMLDivElement;
    infoEl: HTMLDivElement;
    buttonsEl: HTMLDivElement;
    canSave: boolean = false;
    eventEl: HTMLDivElement;
    preset: Calendar;
    categoryEl: HTMLDivElement;
    eventsUI: EventsUI;
    infoDetailEl: HTMLDetailsElement;
    dateFieldEl: HTMLDivElement;
    uiEl: HTMLDivElement;
    leapdayEl: any;
    yearEl: HTMLDivElement;
    get static() {
        return this.calendar.static;
    }
    get week() {
        return this.static.weekdays;
    }
    get months() {
        return this.static.months;
    }
    get events() {
        return this.calendar.events;
    }
    constructor(public plugin: FantasyCalendar, existing?: Calendar) {
        super(plugin.app);
        this.calendar.id = nanoid(6);
        if (existing) {
            this.editing = true;
            this.calendar = copy(existing);
        }
        this.containerEl.addClass("obsical-create-calendar");
    }
    async display() {
        console.log('displaying??')
        this.contentEl.empty();

        this.contentEl.createEl("h3", {
            text: this.editing ? "Edit Calendar" : "New Calendar"
        });

        const presetEl = this.contentEl.createDiv(
            "obsical-apply-preset"
        );
        
            const today = new Date();
            const preset = PRESET_CALENDARS[0];
            preset.current = {
                year: today.getFullYear(),
                month: today.getMonth(),
                day: today.getDate()
            };
        
        this.calendar = {
            ...preset,
            id: this.calendar.id
        };

        this.uiEl = this.contentEl.createDiv("obsical-ui");

        this.buttonsEl = this.contentEl.createDiv("fantasy-context-buttons");
        this.buildButtons();
        this.infoEl = this.uiEl.createDiv("calendar-info");
        this.buildInfo();

        this.weekdayEl = this.uiEl.createDiv();
        this.buildWeekdays();
        this.monthEl = this.uiEl.createDiv("obsical-element");
        this.buildMonths();
        this.yearEl = this.uiEl.createDiv("obsical-element");
        this.buildYear();
        this.leapdayEl = this.uiEl.createDiv("obsical-element");
        this.buildLeapDays();
        this.eventEl = this.uiEl.createDiv("obsical-element");
        this.buildEvents();
        this.categoryEl = this.uiEl.createDiv("obsical-element");
        this.buildCategories();
    }

    buildInfo() {
        this.infoEl.empty();
        this.infoDetailEl = this.infoEl.createEl("details", {
            attr: { open: true }
        });
        this.infoDetailEl
            .createEl("summary")
            .createEl("h4", { text: "Basic Info" });
        new Setting(this.infoDetailEl).setName("Calendar Name").addText((t) => {
            t.setValue(this.calendar.name).onChange(
                (v) => (this.calendar.name = v)
            );
        });

        const descriptionEl = this.infoDetailEl.createDiv(
            "calendar-description"
        );
        descriptionEl.createEl("label", { text: "Calendar Description" });
        new TextAreaComponent(descriptionEl)
            .setPlaceholder("Calendar Description")
            .setValue(this.calendar.description)
            .onChange((v) => {
                this.calendar.description = v;
            });

        new Setting(this.infoDetailEl)
            .setName("Display Day Number")
            .setDesc("Display the day of the year.")
            .addToggle((t) => {
                t.setValue(this.static.displayDayNumber).onChange((v) => {
                    this.static.displayDayNumber = v;
                    this.buildInfo();
                });
            });

        new Setting(this.infoDetailEl)
            .setName("Auto Increment Day")
            .setDesc("Automatically increment the calendar day every real day.")
            .addToggle((t) => {
                t.setValue(this.static.incrementDay).onChange((v) => {
                    this.static.incrementDay = v;
                });
            });

        this.dateFieldEl = this.infoDetailEl.createDiv();
        this.buildDateFields();
    }
    tempCurrentDays = this.calendar.current.day;
    buildDateFields() {
        this.dateFieldEl.empty();

        new Setting(this.dateFieldEl)
            .setClass("obsical-date-fields-heading")
            .setHeading()
            .setName("Current Date");
        const dateFieldEl = this.dateFieldEl.createDiv(
            "obsical-date-fields"
        );
        if (this.tempCurrentDays == null && this.calendar.current.day) {
            this.tempCurrentDays = this.calendar.current.day;
        }

        if (
            this.tempCurrentDays != undefined &&
            this.calendar.current.month != undefined &&
            this.tempCurrentDays >
                this.calendar.static.months[this.calendar.current.month]?.length
        ) {
            this.tempCurrentDays =
                this.calendar.static.months[
                    this.calendar.current.month
                ]?.length;
        }
        const dayEl = dateFieldEl.createDiv("obsical-date-field");
        dayEl.createEl("label", { text: "Day" });
        const day = new TextComponent(dayEl)
            .setPlaceholder("Day")
            .setValue(`${this.tempCurrentDays}`)
            .setDisabled(this.calendar.current.month == undefined)
            .onChange((v) => {
                if (
                    Number(v) < 1 ||
                    (Number(v) >
                        this.calendar.static.months[this.calendar.current.month]
                            ?.length ??
                        Infinity)
                ) {
                    new Notice(
                        `The current day must be between 1 and ${
                            this.calendar.static.months[
                                this.calendar.current.month
                            ].length
                        }`
                    );
                    this.tempCurrentDays = this.calendar.current.day;
                    this.buildDateFields();
                    return;
                }
                this.tempCurrentDays = Number(v);
            });
        day.inputEl.setAttr("type", "number");

        const monthEl = dateFieldEl.createDiv("obsical-date-field");
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
                this.calendar.current.month != undefined
                    ? this.calendar.static.months[this.calendar.current.month]
                          .name
                    : "select"
            )
            .onChange((v) => {
                if (v === "select") this.calendar.current.month = null;
                const index = this.calendar.static.months.find(
                    (m) => m.name == v
                );
                this.calendar.current.month =
                    this.calendar.static.months.indexOf(index);
                this.buildDateFields();
            });

        const yearEl = dateFieldEl.createDiv("obsical-date-field");
        yearEl.createEl("label", { text: "Year" });
        if (this.calendar.static.useCustomYears) {
            const yearDrop = new DropdownComponent(yearEl);
            (this.calendar.static.years ?? []).forEach((year) => {
                yearDrop.addOption(year.id, year.name);
            });
            if (
                this.calendar.current.year > this.calendar.static.years?.length
            ) {
                this.calendar.current.year = this.calendar.static.years
                    ? this.calendar.static.years.length
                    : null;
            }
            yearDrop
                .setValue(
                    this.calendar.static.years?.[this.calendar.current.year - 1]
                        ?.id
                )
                .onChange((v) => {
                    this.calendar.current.year =
                        this.calendar.static.years.findIndex((y) => y.id == v) +
                        1;
                });
        } else {
            const year = new TextComponent(yearEl)
                .setPlaceholder("Year")
                .setValue(`${this.calendar.current.year}`)
                .onChange((v) => {
                    this.calendar.current.year = Number(v);
                });
            year.inputEl.setAttr("type", "number");
        }
    }

    buildWeekdays() {
        this.weekdayEl.empty();
        const weekday = new Weekdays({
            target: this.weekdayEl,
            props: {
                weekdays: this.week,
                firstWeekday: this.calendar.static.firstWeekDay,
                overflow: this.calendar.static.overflow
            }
        });

        weekday.$on("weekday-update", (e) => {
            this.calendar.static.weekdays = e.detail;

            if (
                !this.calendar.static.firstWeekDay &&
                this.calendar.static.weekdays.length
            ) {
                this.calendar.static.firstWeekDay = 0;
                weekday.$set({
                    firstWeekday: this.calendar.static.firstWeekDay
                });
            }

            this.checkCanSave();
        });
        weekday.$on("first-weekday-update", (e: CustomEvent<number>) => {
            this.calendar.static.firstWeekDay = e.detail;
        });
        weekday.$on("overflow-update", (e: CustomEvent<boolean>) => {
            this.calendar.static.overflow = e.detail;
            if (!this.calendar.static.overflow)
                this.calendar.static.firstWeekDay = 0;

            weekday.$set({
                firstWeekday: this.calendar.static.firstWeekDay
            });
        });
    }
    buildMonths() {
        this.monthEl.empty();
        const months = new Months({
            target: this.monthEl,
            props: {
                months: this.months
            }
        });

        months.$on("month-update", (e) => {
            this.calendar.static.months = e.detail;

            this.buildDateFields();
            this.checkCanSave();
        });
    }
    buildYear() {
        this.yearEl.empty();
        const years = new Year({
            target: this.yearEl,
            props: {
                useCustomYears: this.static.useCustomYears,
                years: this.static.years,
                app: this.app
            }
        });
        years.$on("years-update", (e: CustomEvent<YearType[]>) => {
            this.calendar.static.years = e.detail;
            this.buildDateFields();
            this.buildEvents();
        });
        years.$on("use-custom-update", (e: CustomEvent<boolean>) => {
            this.calendar.static.useCustomYears = e.detail;
            this.buildDateFields();
            this.buildEvents();
        });
    }
    buildLeapDays() {
        this.leapdayEl.empty();
        const leapdayUI = new LeapDays({
            target: this.leapdayEl,
            props: {
                leapdays: this.static.leapDays
            }
        });

        leapdayUI.$on("new-item", async (e: CustomEvent<LeapDay>) => {
            const modal = new CreateLeapDayModal(
                this.app,
                this.calendar,
                e.detail
            );
            modal.onClose = () => {
                if (!modal.saved) return;
                //2022.1.19 rf this might be broken now
                leapdayUI.$set({ leapdays: this.calendar.static.leapDays });
                this.plugin.saveCalendar();
            };
            modal.open();
        });

        leapdayUI.$on("edit-leapdays", (e: CustomEvent<LeapDay[]>) => {
            this.calendar.static.leapDays = e.detail;
        });
    }

    buildEvents() {
        this.eventEl.empty();
        this.eventsUI = new EventsUI({
            target: this.eventEl,
            props: {
                events: this.events,
                months: this.calendar.static.months,
                categories: this.calendar.categories
            }
        });
        this.eventsUI.$on("new-item", async (e: CustomEvent<Event>) => {
            const modal = new CreateEventModal(
                this.app,
                this.calendar,
                e.detail
            );
            modal.onClose = () => {
                if (!modal.saved) return;
                if (modal.editing) {
                    const index = this.calendar.events.indexOf(
                        this.calendar.events.find(
                            (e) => e.id === modal.event.id
                        )
                    );

                    this.calendar.events.splice(index, 1, { ...modal.event });
                } else {
                    this.calendar.events.push({ ...modal.event });
                }
                this.eventsUI.$set({ events: this.events });
                this.plugin.saveCalendar();
            };
            modal.open();
        });

        this.eventsUI.$on("edit-events", (e: CustomEvent<Event[]>) => {
            this.calendar.events = e.detail;
        });

        this.eventEl.setAttr(
            `style`,
            `--event-max-width: ${
                this.eventEl.getBoundingClientRect().width
            }px;`
        );
    }
    buildCategories() {
        this.categoryEl.empty();
        const category = new Categories({
            target: this.categoryEl,
            props: {
                categories: this.calendar.categories
            }
        });

        category.$on("new", (event: CustomEvent<EventCategory>) => {
            this.calendar.categories.push(event.detail);
            this.eventsUI.$set({
                categories: this.calendar.categories
            });
        });

        category.$on("update", (event: CustomEvent<EventCategory>) => {
            const existing = this.calendar.categories.find(
                (c) => c.id == event.detail.id
            );

            this.calendar.categories.splice(
                this.calendar.categories.indexOf(existing),
                1,
                event.detail
            );
            this.eventsUI.$set({
                categories: this.calendar.categories,
                events: this.events
            });
        });
        category.$on("delete", (event: CustomEvent<EventCategory>) => {
            this.calendar.categories.splice(
                this.calendar.categories.indexOf(event.detail),
                1
            );
            this.eventsUI.$set({
                categories: this.calendar.categories,
                events: this.events
            });
        });
    }

    checkCanSave() {
        if (
            this.months?.length &&
            this.months?.every((m) => m.name?.length) &&
            this.months?.every((m) => m.length > 0) &&
            this.week?.length &&
            this.week?.every((d) => d.name?.length) &&
            this.calendar.name?.length &&
            this.calendar.static.firstWeekDay <
                (this.week?.length ?? Infinity) &&
            (!this.calendar.static.useCustomYears ||
                (this.calendar.static.useCustomYears &&
                    this.calendar.static.years?.length &&
                    this.calendar.static.years.every((y) => y.name?.length)))
        ) {
            this.canSave = true;
        }
    }
    buildButtons() {
        this.buttonsEl.empty();

        new ButtonComponent(this.buttonsEl)
            .setCta()
            .setButtonText(this.editing ? "Save" : "Create")
            .onClick(() => {
                if (!this.canSave) {
                    this.checkCanSave();
                }
                if (!this.canSave) {
                    if (!this.calendar.name?.length) {
                        new Notice("The calendar name is required!");
                    } else if (!this.week.length) {
                        new Notice("At least one weekday is required.");
                    } else if (!this.week.every((w) => w.name?.length)) {
                        new Notice("Every weekday must have a name.");
                    } else if (!this.months.length) {
                        new Notice("At least one month is required.");
                    } else if (!this.months.every((m) => m.name?.length)) {
                        new Notice("Every month must have a name.");
                    } else if (!this.months.every((m) => m.length)) {
                        new Notice("Every month must have a length.");
                    } else if (
                        this.calendar.static.useCustomYears &&
                        !this.calendar.static.years?.length
                    ) {
                        new Notice("Custom years must be defined.");
                    } else if (
                        this.calendar.static.useCustomYears &&
                        !this.calendar.static.years.every((y) => y.name?.length)
                    ) {
                        new Notice("Each custom year must be named.");
                    } else if (
                        this.calendar.static.firstWeekDay >= this.week.length
                    ) {
                        new Notice(
                            "The first day of the week must be a valid weekday."
                        );
                    }
                    return;
                }
                this.calendar.current.day = this.tempCurrentDays;
                this.saved = true;
                this.close();
            });
        new ExtraButtonComponent(this.buttonsEl)
            .setTooltip("Cancel")
            .setIcon("cross")
            .onClick(() => this.close());
    }
    onOpen() {
        this.display();
    }
}

export class CalendarPresetModal extends Modal {
    preset: Calendar;
    saved: boolean;
    async onOpen() {
        await this.display();
    }
    async display() {
        this.containerEl.addClass("obsical-choose-preset");
        this.contentEl.empty();
        this.contentEl.createEl("h3", {
            text: "Choose a Preset Calendar"
        });

        const presetEl = this.contentEl.createDiv(
            "obsical-preset-container"
        );

        for (const preset of PRESET_CALENDARS) {
            const button = new ButtonComponent(presetEl).onClick(() => {
                this.preset = preset;
                this.display();
            });
            if (this.preset == preset) button.setCta();
            button.buttonEl.createDiv({
                cls: "setting-item-name",
                text: preset.name
            });
            button.buttonEl.createDiv({
                cls: "setting-item-description",
                text: preset.description
            });
        }

        const buttonEl = this.contentEl.createDiv(
            "obsical-confirm-buttons"
        );
        new ButtonComponent(buttonEl)
            .setButtonText("Apply")
            .onClick(() => {
                this.saved = true;
                this.close();
            })
            .setCta();
        new ExtraButtonComponent(buttonEl).setIcon("cross").onClick(() => {
            this.close();
        });
    }
}
