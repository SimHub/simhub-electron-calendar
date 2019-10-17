// const storage = require("electron-json-storage");
const dataPath = storage.getDataPath();
console.log(dataPath);

const clearStorageBtn = $("#clearStorage");
let datePicker, selectedCalendar;

let storageArr = [];
clearStorageBtn.on("click", () => {
  storage.clear(function(error) {
    if (error) throw error;
  });
  location.reload();
});

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
    // drag event
    lastSchedule.id = e.schedule.id;
    lastSchedule.calendarId = e.schedule.calendarId;
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
    // console.log("lastSchedule ", lastSchedule);
    // console.log("beforeUpdateSchedule", e);

    storage.get(lastSchedule.id, function(error, data) {
      if (error) throw error;
      // console.log(e.triggerEventName);
      if (e.triggerEventName === "click") {
        storage.set(e.schedule.id, lastSchedule);
      } else {
        storage.set(e.schedule.id, e.schedule);
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
  CalendarList.forEach(function(calendar) {
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
  });
  calendarList.innerHTML = html.join("\n");
})();
