import { cal, setSchedules, saveNewSchedule } from "./default.js";
import { CalendarList, findCalendar } from "./data/calendars.js"; /* ES6 */
const storage = require("electron-json-storage");
const dataPath = storage.getDataPath();
console.log(dataPath);

const clearStorageBtn = $("#clearStorage");
let datePicker, selectedCalendar;

let storageArr = [];
// clearStorageBtn.on("click", () => {
// storage.clear(function(error) {
// if (error) throw error;
// storage.set("calendar", CalendarList);
// });
// location.reload();
// });

let lastSchedule = {};
// event handlers
cal.on({
  clickMore: function(e) {
    console.log("clickMore", e);
  },
  clickSchedule: function(e) {
    console.log("clickSchedule", e);
    lastSchedule = e.schedule;
  },
  clickDayname: function(date) {
    console.log("clickDayname", date);
  },
  beforeCreateSchedule: function(e) {
    console.log("beforeCreateSchedule", e);
    saveNewSchedule(e);
  },
  beforeUpdateSchedule: function(e) {
    console.log(e);
    // drag event
    lastSchedule.id = e.schedule.id;
    lastSchedule.calendarId = e.schedule.calendarId;
    lastSchedule.bgColor = e.schedule.bgColor;
    lastSchedule.borderColor = e.schedule.borderColor;
    lastSchedule.color = e.schedule.color;
    lastSchedule.title = e.schedule.title;
    lastSchedule.location = e.schedule.location;
    lastSchedule.state = e.schedule.state;
    lastSchedule.isAllDay = e.schedule.isAllDay;
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
    console.log("lastSchedule ", lastSchedule);
    console.log("beforeUpdateSchedule", e);

    storage.get(lastSchedule.id, function(error, data) {
      if (error) throw error;
      console.log(e.triggerEventName);
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
      end: lastSchedule.end
    });
  },
  beforeDeleteSchedule: function(e) {
    console.log("beforeDeleteSchedule", e);

    storage.remove(e.schedule.id, function(error) {
      if (error) throw error;
    });
    cal.deleteSchedule(e.schedule.id, e.schedule.calendarId);
  },
  afterRenderSchedule: function(e) {
    var schedule = e.schedule;
    var element = cal.getElement(schedule.id, schedule.calendarId);
    // console.log("afterRenderSchedule", schedule);
  },
  clickTimezonesCollapseBtn: function(timezonesCollapsed) {
    console.log("timezonesCollapsed", timezonesCollapsed);

    if (timezonesCollapsed) {
      cal.setTheme({
        "week.daygridLeft.width": "77px",
        "week.timegridLeft.width": "77px"
      });
    } else {
      cal.setTheme({
        "week.daygridLeft.width": "60px",
        "week.timegridLeft.width": "60px"
      });
    }

    return true;
  }
});

/**
 * A listener for click the menu
 * @param {Event} e - click event
 */

// new schedule Btn
$("#btn-new-schedule").on("click", e => {
  e.preventDefault();
  // console.log("CLICKED!");
  cal.openCreationPopup();
});

// set calendars
(function() {
  var calendarList = document.getElementById("calendarList");
  var html = [];
  let calArr = [];
  let storageCal = storage.get("calendar", (e, d) => {
    if (e) console.error(e);
    console.log(d);
    calArr.push(d);
  });
  console.log(CalendarList);
  console.log(calArr);
  storage.get("calendar", (e, cal) => {
    if (e) console.error(e);
    let c = cal.length !== undefined ? cal : CalendarList;
    console.log(cal.length);
    console.log(cal);
    console.log("WHAAAAT");
    c.forEach(calendar => {
      console.log(calendar);
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

    // $("#calendarList .lnb-calendars-item").on("dblclick", function(e) {
    // let el = $(this)
    // .find("label")
    // .children()
    // .eq(2);
    // console.log("dbClick!!! ", e);
    // console.log("THIS ", el);

    // el.css({
    // width: "100%",
    // height: "25px",
    // "line-height": "19px",
    // border: "1px solid",
    // "border-radius": "3px",
    // "line-height": "0"
    // }).prop("contenteditable", true);

    // el.focusout(function(e) {
    // console.log("focueOUT");
    // console.log($(e.target).text());
    // $(".lnb-calendars-item").each(item => {
    // console.log(item);
    // });
    // $(e.target)
    // .css({
    // width: "",
    // height: "",
    // "line-height": "",
    // border: "",
    // "border-radius": "",
    // "line-height": ""
    // })
    // .removeAttr("contenteditable");
    // });

    // // storage.set("calendar", CalendarList);
    // console.log(CalendarList);
    // });
  }); // End Storage
})();
