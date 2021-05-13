import moment from "moment";
import * as $ from "jquery";
import Calendar from "tui-calendar"; /* ES6 */
import {
  initCalendar,
  CalendarList,
  findCalendar,
} from "./data/calendars.js"; /* ES6 */
import { ScheduleInfo } from "./data/schedules.js"; /* ES6 */
var throttle = require("tui-code-snippet/tricks/throttle");
const storage = require("electron-json-storage");
const dataPath = storage.getDataPath();
// console.log(dataPath);
var Chance = require("chance");

// Instantiate Chance so it can be used
var chance = new Chance();

// const { app } = require('electron').remote;
// const p=app.getPath('userData');
// console.log(p)

let resizeThrottled;

const templates = {
  popupIsAllDay: function () {
    return "All Day";
  },
  popupStateFree: function () {
    return "Free";
  },
  popupStateBusy: function () {
    return "Busy";
  },
  titlePlaceholder: function () {
    return "Subject";
  },
  locationPlaceholder: function () {
    return "Location";
  },
  startDatePlaceholder: function () {
    return "Start date";
  },
  endDatePlaceholder: function () {
    return "End date";
  },
  popupSave: function () {
    setTimeout(() => {
      $(
        ".tui-full-calendar-popup-section-item.tui-full-calendar-section-allday"
      ).css({ display: "none" });
    }, 100);
    return "Save";
  },
  popupUpdate: function () {
    setTimeout(() => {
      $(
        ".tui-full-calendar-popup-section-item.tui-full-calendar-section-allday"
      ).css({ display: "none" });
    }, 100);
    return "Update";
  },
  popupDetailDate: function (isAllDay, start, end) {
    var isSameDate = moment(start).isSame(end);
    var endFormat = (isSameDate ? "" : "YYYY.MM.DD ") + "hh:mm a";
    if (isAllDay) {
      return (
        moment(start).format("YYYY.MM.DD") +
        (isSameDate ? "" : " - " + moment(end).format("YYYY.MM.DD"))
      );
    }
    return (
      moment(start).format("YYYY.MM.DD hh:mm a") +
      " - " +
      moment(end).format(endFormat)
    );
  },
  popupDetailLocation: function (schedule) {
    return "Location : " + schedule.location;
  },
  popupDetailUser: function (schedule) {
    return "User : " + (schedule.attendees || []).join(", ");
  },
  popupDetailState: function (schedule) {
    return "State : " + schedule.state || "Busy";
  },
  popupDetailRepeat: function (schedule) {
    return "Repeat : " + schedule.recurrenceRule;
  },
  popupDetailBody: function (schedule) {
    return "Body : " + schedule.body;
  },
  popupEdit: function (e) {
    return "Edit";
  },
  popupDelete: function () {
    return "Delete";
  },
};
export const cal = new Calendar("#calendar", {
  defaultView: "month",
  template: templates,
  taskView: true,
  useCreationPopup: true,
  useDetailPopup: true,
});

function init() {
  storage.has("calendar", (e, hasKey) => {
    if (e) throw e;
    // console.log(hasKey);
    if (hasKey) {
      storage.get("calendar", (e, d) => {
        if (e) throw e;
        // console.log(d);
        cal.setCalendars(d);
      });
    } else {
      cal.setCalendars(CalendarList);
    }
  });

  setRenderRangeText();
  setSchedules();
  setEventListener();
  initCalendar();
}

function getDataAction(target) {
  return target.dataset
    ? target.dataset.action
    : target.getAttribute("data-action");
}

function setDropdownCalendarType() {
  var calendarTypeName = document.getElementById("calendarTypeName");
  var calendarTypeIcon = document.getElementById("calendarTypeIcon");
  var options = cal.getOptions();
  var type = cal.getViewName();
  var iconClassName;

  $("#btn-new-schedule").slideDown("slow");
  if (type === "day") {
    type = "Daily";
    iconClassName = "calendar-icon ic_view_day";
    $("#btn-new-schedule").slideUp("slow");
  } else if (type === "week") {
    type = "Weekly";
    iconClassName = "calendar-icon ic_view_week";
    $("#btn-new-schedule").slideUp("slow");
    // console.log("change");
  } else if (options.month.visibleWeeksCount === 2) {
    type = "2 weeks";
    iconClassName = "calendar-icon ic_view_week";
  } else if (options.month.visibleWeeksCount === 3) {
    type = "3 weeks";
    iconClassName = "calendar-icon ic_view_week";
  } else {
    type = "Monthly";
    iconClassName = "calendar-icon ic_view_month";
  }

  calendarTypeName.innerHTML = type;
  calendarTypeIcon.className = iconClassName;
}

function onClickMenu(e) {
  // console.log("CLICKED!!!");
  var target = $(e.target).closest('a[role="menuitem"]')[0];
  var action = getDataAction(target);
  var options = cal.getOptions();
  var viewName = "";

  switch (action) {
    case "toggle-daily":
      viewName = "day";
      break;
    case "toggle-weekly":
      viewName = "week";
      break;
    case "toggle-monthly":
      options.month.visibleWeeksCount = 0;
      viewName = "month";
      break;
    case "toggle-weeks2":
      options.month.visibleWeeksCount = 2;
      viewName = "month";
      break;
    case "toggle-weeks3":
      options.month.visibleWeeksCount = 3;
      viewName = "month";
      break;
    case "toggle-narrow-weekend":
      options.month.narrowWeekend = !options.month.narrowWeekend;
      options.week.narrowWeekend = !options.week.narrowWeekend;
      viewName = cal.getViewName();

      target.querySelector("input").checked = options.month.narrowWeekend;
      break;
    case "toggle-start-day-1":
      options.month.startDayOfWeek = options.month.startDayOfWeek ? 0 : 1;
      options.week.startDayOfWeek = options.week.startDayOfWeek ? 0 : 1;
      viewName = cal.getViewName();

      target.querySelector("input").checked = options.month.startDayOfWeek;
      break;
    case "toggle-workweek":
      options.month.workweek = !options.month.workweek;
      options.week.workweek = !options.week.workweek;
      viewName = cal.getViewName();

      target.querySelector("input").checked = !options.month.workweek;
      break;
    default:
      break;
  }

  cal.setOptions(options, true);
  cal.changeView(viewName, true);

  setDropdownCalendarType();
  setRenderRangeText();
  // setSchedules();
}

function onClickNavi(e) {
  var action = getDataAction(e.target);

  switch (action) {
    case "move-prev":
      cal.prev();
      break;
    case "move-next":
      cal.next();
      break;
    case "move-today":
      cal.today();
      break;
    default:
      return;
  }

  setRenderRangeText();
  setSchedules();
}

function setRenderRangeText() {
  var renderRange = document.getElementById("renderRange");
  var options = cal.getOptions();
  var viewName = cal.getViewName();
  var html = [];
  if (viewName === "day") {
    html.push(moment(cal.getDate().getTime()).format("YYYY.MM.DD"));
  } else if (
    viewName === "month" &&
    (!options.month.visibleWeeksCount || options.month.visibleWeeksCount > 4)
  ) {
    html.push(moment(cal.getDate().getTime()).format("YYYY.MM"));
  } else {
    html.push(moment(cal.getDateRangeStart().getTime()).format("YYYY.MM.DD"));
    html.push(" ~ ");
    html.push(moment(cal.getDateRangeEnd().getTime()).format(" MM.DD"));
  }
  renderRange.innerHTML = html.join("");
}

export function setSchedules() {
  cal.clear();

  let arr = [];

  var schedule = new ScheduleInfo();

  storage.getAll(function (error, data) {
    if (error) throw error;
    try {
      // console.log("SCHEDULE: ", data);

      Object.values(data).forEach((i) => {
        // console.log(typeof i);
        // console.log(i.length);
        // console.log(i);
        // console.log(i.raw )
        if (i.length === undefined) {
          arr.push({
            id: i.id,
            bgColor: i.bgColor,
            borderColor: i.borderColor,
            color: i.color,
            state: i.state,
            calendarId: i.calendarId,
            title: i.title,
            category: i.category,
            dueDateClass: i.dueDateClass,
            start: i.start._date,
            end: i.end._date,
            raw: i.raw,
            isAllDay: i.isAllDay,
            category: i.category,
          });
        }
      });
      // console.log([arr[0]]);
      arr.forEach((task) => {
        // console.log(task);
        cal.createSchedules([task]);
      });
      //cal.createSchedules([arr[0]]);
      refreshScheduleVisibility();
    } catch (e) {
      console.log("NOOP: ", e);
    }
  });

  // cal.createSchedules([ScheduleList['TPJJYAIT']]);
}

export function saveNewSchedule(scheduleData) {
  // console.log("saved ", scheduleData);
  let Id = chance.string({
    length: 8,
    casing: "upper",
    alpha: true,
    numeric: true,
  });
  var calendar = scheduleData.calendar || findCalendar(scheduleData.calendarId);
  var schedule = {
    id: Id,
    title: scheduleData.title,
    isAllDay: scheduleData.isAllDay,
    start: scheduleData.start,
    end: scheduleData.end,
    category: scheduleData.isAllDay ? "allday" : "time",
    dueDateClass: "",
    color: calendar.color,
    bgColor: calendar.bgColor,
    dragBgColor: calendar.bgColor,
    borderColor: calendar.borderColor,
    location: scheduleData.location,
    // raw: {
    // class: scheduleData.raw["class"]
    // },
    raw: scheduleData.raw,
    state: scheduleData.state,
    calendarId: scheduleData.calendarId,
  };
  // console.log(calendar);
  if (calendar) {
    schedule.calendarId = calendar.id;
    // schedule.color = calendar.color;
    // schedule.bgColor = calendar.bgColor;
    // schedule.borderColor = calendar.borderColor;
  }
  // console.log(schedule)
  // storage.set("schedule", { [`${schedule.id}`]: schedule }, function(error) {
  storage.set(schedule.id, schedule, function (error) {
    if (error) throw error;
  });
  cal.createSchedules([schedule]);

  refreshScheduleVisibility();
}

function refreshScheduleVisibility() {
  var calendarElements = Array.prototype.slice.call(
    document.querySelectorAll("#calendarList input")
  );

  CalendarList.forEach(function (calendar) {
    cal.toggleSchedules(calendar.id, !calendar.checked, false);
  });

  cal.render(true);

  calendarElements.forEach(function (input) {
    var span = input.nextElementSibling;
    span.style.backgroundColor = input.checked
      ? span.style.borderColor
      : "transparent";
  });
}

resizeThrottled = throttle(function () {
  cal.render();
}, 50);

function setEventListener() {
  $("#menu-navi").on("click", onClickNavi);
  $('.dropdown-menu a[role="menuitem"]').on("click", onClickMenu);
  $("#lnb-calendars").on("change", onChangeCalendars);
  window.addEventListener("resize", resizeThrottled);
}

function onChangeCalendars(e) {
  let calElement = e.target;
  var calendarId = e.target.value;
  var checked = e.target.checked;
  var viewAll = document.querySelector(".lnb-calendars-item input");
  var calendarElements = Array.prototype.slice.call(
    document.querySelectorAll("#calendarList input")
  );
  var allCheckedCalendars = true;
  // console.log(calendarId);
  if (calendarId === "all") {
    allCheckedCalendars = checked;

    calendarElements.forEach(function (input) {
      var span = input.parentNode;
      input.checked = checked;
      span.style.backgroundColor = checked
        ? span.style.borderColor
        : "transparent";
    });

    CalendarList.forEach(function (calendar) {
      calendar.checked = checked;
    });
  } else {
    findCalendar(calendarId).checked = checked;

    allCheckedCalendars = calendarElements.every(function (input) {
      return input.checked;
    });

    if (allCheckedCalendars) {
      viewAll.checked = true;
    } else {
      viewAll.checked = false;
    }
  }

  /// Edit Calendar///
  if (calendarId === "edit") {
    // console.log(calElement.checked);
    // console.log("edit element ", calElement);
    if (calElement.checked) {
      calendarElements.forEach(function (el) {
        var span = $(el).siblings().eq(1);
        // console.log(span);
        span
          .css({
            width: "100%",
            height: "25px",
            "line-height": "19px",
            border: "2px solid #000",
            "border-radius": "3px",
            "line-height": "0",
            "box-sizing": "border-box",
            padding: "1px",
            color: "grey",
          })
          .prop("contenteditable", true);
      });
    } else {
      calendarElements.forEach(function (el) {
        var span = $(el).siblings().eq(1);
        let id = span.siblings().eq(0).val();
        let txt = span.text();
        span
          .css({
            width: "",
            height: "",
            "line-height": "",
            border: "",
            "border-radius": "",
            "line-height": "",
            color: "#000",
          })
          .removeAttr("contenteditable");
        // console.log(id, txt);
        CalendarList[parseInt(id) - 1].id = id;
        CalendarList[parseInt(id) - 1].name = txt;
        // console.log(CalendarList[parseInt(id)-1]);
      });
      // console.log(CalendarList)
      storage.set("calendar", CalendarList);
    }
  }

  ////////////
  // setRenderRangeText();
  // setSchedules();
  // setEventListener();
  // initCalendar();
  /////////////////
  refreshScheduleVisibility();
}

cal.on({
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

init();
