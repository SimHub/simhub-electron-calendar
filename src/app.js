import { cal, setSchedules, saveNewSchedule } from "./default.js";
import { CalendarList, findCalendar } from "./data/calendars.js"; /* ES6 */
import * as $ from "jquery";
import Reminder from "./features/Reminder.js";
const storage = require("electron-json-storage");
const dataPath = storage.getDataPath();
// console.log(dataPath);

const clearStorageBtn = $("#clearStorage");

let lastSchedule = {};
// event handlers
cal.on({
  clickMore: function (e) {
    // console.log("clickMore", e);
  },
  clickSchedule: function (e) {
    // console.log("clickSchedule", e);
    setTimeout(Reminder.showReminderOnEditPopup(storage, e.schedule.id), 300);
    lastSchedule = e.schedule;
  },
  clickDayname: function (date) {
    // console.log("clickDayname", date);
  },
  beforeCreateSchedule: function (e) {
    // console.log("beforeCreateSchedule", e);
    saveNewSchedule(e);
  },
  beforeUpdateSchedule: function (e) {
    // console.log("beforeUpdateSchedule: ", e);
    // drag event
    lastSchedule.id = e.schedule.id;
    let _s = e.schedule;
    if (e.changes !== null) {
      let _c = e.changes;
      lastSchedule.calendarId = _c.calendarId ? _c.calendarId : _s.calendarId;
      lastSchedule.bgColor = e.changes.bgColor ? _c.bgColor : _s.bgColor;
      lastSchedule.borderColor = e.changes.borderColor
        ? _c.borderColor
        : _s.borderColor;
      lastSchedule.color = e.changes.color ? _c.color : _s.color;
      lastSchedule.title = e.changes.title ? _c.title : _s.title;
      lastSchedule.location =
        e.changes.location !== "" ? _c.location : _s.location;
      lastSchedule.state = e.changes.state ? _c.state : _s.state;
      lastSchedule.isAllDay = e.changes.isAllDay ? _c.isAllDay : _s.isAllDay;
      lastSchedule.reminder = Reminder.getReminder();
      lastSchedule.reminderDate = Reminder.reminderDate(
        e.start,
        Reminder.getReminder()
      );
      lastSchedule.reminderIsSet = Reminder.reminderIsSet(
        Reminder.getReminder()
      );
      lastSchedule.reminderIsActive = false;
      lastSchedule.isSchedule = true;
    } //End if
    else {
      lastSchedule.calendarId = e.schedule.calendarId;
      lastSchedule.bgColor = e.schedule.bgColor;
      lastSchedule.borderColor = e.schedule.borderColor;
      lastSchedule.color = e.schedule.color;
      lastSchedule.title = e.schedule.title;
      lastSchedule.location = e.schedule.location;
      lastSchedule.state = e.schedule.state;
      lastSchedule.isAllDay = e.schedule.isAllDay;
      lastSchedule.reminder = Reminder.getReminder();
      lastSchedule.reminderDate = Reminder.reminderDate(
        e.start,
        Reminder.getReminder()
      );
      lastSchedule.reminderIsActive = false;
      lastSchedule.reminderIsSet = Reminder.reminderIsSet(
        Reminder.getReminder()
      );
      lastSchedule.isSchedule = true;
    }
    ////
    lastSchedule.start = e.start;
    lastSchedule.end = e.end;
    // console.log(e.calendar);
    if (e.calendar) {
      lastSchedule.bgColor = e.calendar.bgColor;
      lastSchedule.borderColor = e.calendar.borderColor;
      lastSchedule.checked = e.calendar.checked;
      lastSchedule.color = e.calendar.color;
      lastSchedule.dragBgColor = e.calendar.dragBgColor;
      lastSchedule.name = e.calendar.name;
    }
    if (lastSchedule.isAllDay) {
      lastSchedule.category = "allday";
      e.schedule.category = "allday";
    } else if (!lastSchedule.isAllDay) {
      lastSchedule.category = "time";
      e.schedule.category = "time";
    }

    storage.get(lastSchedule.id, function (error, data) {
      if (error) throw error;
      // console.log(e.triggerEventName);
      if (e.triggerEventName === "click") {
        // storage.set("schedule", { [`${e.schedule.id}`]: lastSchedule });
        storage.set(e.schedule.id, lastSchedule);
      } else {
        // storage.set("schedule", { [`${e.schedule.id}`]: e.schedule });
        storage.set(e.schedule.id, lastSchedule);
      }
    });
    cal.updateSchedule(lastSchedule.id, lastSchedule.calendarId, {
      start: lastSchedule.start,
      end: lastSchedule.end,
    });
    //### set storage reminder->reminderIsActive to false
    storage.set("reminder_" + lastSchedule.id, {
      id: lastSchedule.id,
      reminderIsActive: false,
    });
  },
  beforeDeleteSchedule: function (e) {
    // console.log("beforeDeleteSchedule", e);
    storage.remove(e.schedule.id, function (error) {
      if (error) throw error;
      storage.remove("reminder_" + e.schedule.id, function (error) {
        if (error) throw error;
      });
    });
    cal.deleteSchedule(e.schedule.id, e.schedule.calendarId);
  },
  afterRenderSchedule: function (e) {
    // console.log("afterRenderSchedule", e);
    var schedule = e.schedule;
    var element = cal.getElement(schedule.id, schedule.calendarId);
  },
  clickTimezonesCollapseBtn: function (timezonesCollapsed) {
    if (timezonesCollapsed) {
      cal.setTheme({
        "week.daygridLeft.width": "77px",
        "week.timegridLeft.width": "77px",
      });
    } else {
      cal.setTheme({
        "week.daygridLeft.width": "60px",
        "week.timegridLeft.width": "60px",
      });
    }
    return true;
  },
});

/**
 * A listener for click the menu
 * @param {Event} e - click event
 */

// new schedule Btn
$("#btn-new-schedule").on("click", (e) => {
  e.preventDefault();
  // console.log("CLICKED!");
  cal.openCreationPopup();
});

// set calendars
(function () {
  var calendarList = document.getElementById("calendarList");
  var html = [];
  let calArr = [];
  let storageCal = storage.get("calendar", (e, d) => {
    if (e) console.error(e);
    calArr.push(d);
  });
  storage.get("calendar", (e, cal) => {
    if (e) console.error(e);
    let c = cal.length !== undefined ? cal : CalendarList;
    c.forEach((calendar) => {
      html.push(
        '<div class="lnb-calendars-item"><label>' +
          '<input type="checkbox" class="tui-full-calendar-checkbox-round" value="' +
          calendar.id +
          '" checked>' +
          '<span style="border-color: ' +
          calendar.borderColor +
          "; background-color: " +
          calendar.borderColor +
          ';"></span>' +
          "<span>" +
          calendar.name +
          "</span>" +
          "</label></div>"
      );

      calendarList.innerHTML = html.join("\n");
    });
  }); // End Storage
})();
