const storage = require("electron-json-storage");

const templates = {
  popupIsAllDay: function() {
    return "All Day";
  },
  popupStateFree: function() {
    return "Free";
  },
  popupStateBusy: function() {
    return "Busy";
  },
  titlePlaceholder: function() {
    return "Subject";
  },
  locationPlaceholder: function() {
    return "Location";
  },
  startDatePlaceholder: function() {
    return "Start date";
  },
  endDatePlaceholder: function() {
    return "End date";
  },
  popupSave: function() {
    return "Save";
  },
  popupUpdate: function() {
    return "Update";
  },
  popupDetailDate: function(isAllDay, start, end) {
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
  popupDetailLocation: function(schedule) {
    return "Location : " + schedule.location;
  },
  popupDetailUser: function(schedule) {
    return "User : " + (schedule.attendees || []).join(", ");
  },
  popupDetailState: function(schedule) {
    return "State : " + schedule.state || "Busy";
  },
  popupDetailRepeat: function(schedule) {
    return "Repeat : " + schedule.recurrenceRule;
  },
  popupDetailBody: function(schedule) {
    return "Body : " + schedule.body;
  },
  popupEdit: function() {
    return "Edit";
  },
  popupDelete: function() {
    return "Delete";
  }
};
var cal = new tui.Calendar("#calendar", {
  defaultView: "month",
  template: templates,
  taskView: true,
  useCreationPopup: true,
  useDetailPopup: true
});

function init() {
  cal.setCalendars(CalendarList);

  setRenderRangeText();
  setSchedules();
  setEventListener();
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

  if (type === "day") {
    type = "Daily";
    iconClassName = "calendar-icon ic_view_day";
  } else if (type === "week") {
    type = "Weekly";
    iconClassName = "calendar-icon ic_view_week";
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

function setSchedules() {
  cal.clear();

  let arr = [];

  var schedule = new ScheduleInfo();

  storage.getAll(function(error, data) {
    if (error) throw error;

    console.log(data);
    Object.values(data).forEach(i => {
      // console.log(i);
      // console.log(i.raw )
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
        raw: i.raw
      });
    });
    // console.log([arr[0]]);
    arr.forEach(task => {
      // console.log(task);
      cal.createSchedules([task]);
    });
    //cal.createSchedules([arr[0]]);
    refreshScheduleVisibility();
  });
  // cal.createSchedules([ScheduleList['TPJJYAIT']]);
}

function refreshScheduleVisibility() {
  var calendarElements = Array.prototype.slice.call(
    document.querySelectorAll("#calendarList input")
  );

  CalendarList.forEach(function(calendar) {
    cal.toggleSchedules(calendar.id, !calendar.checked, false);
  });

  cal.render(true);

  calendarElements.forEach(function(input) {
    var span = input.nextElementSibling;
    span.style.backgroundColor = input.checked
      ? span.style.borderColor
      : "transparent";
  });
}

resizeThrottled = tui.util.throttle(function() {
  cal.render();
}, 50);

function setEventListener() {
  $("#menu-navi").on("click", onClickNavi);
  $('.dropdown-menu a[role="menuitem"]').on("click", onClickMenu);
  $("#lnb-calendars").on("change", onChangeCalendars);



  window.addEventListener("resize", resizeThrottled);
}

function onChangeCalendars(e) {
  console.log('CHANGE CAL!!')
  var calendarId = e.target.value;
  var checked = e.target.checked;
  var viewAll = document.querySelector(".lnb-calendars-item input");
  var calendarElements = Array.prototype.slice.call(
    document.querySelectorAll("#calendarList input")
  );
  var allCheckedCalendars = true;

  if (calendarId === "all") {
    allCheckedCalendars = checked;

    calendarElements.forEach(function(input) {
      var span = input.parentNode;
      input.checked = checked;
      span.style.backgroundColor = checked
        ? span.style.borderColor
        : "transparent";
    });

    CalendarList.forEach(function(calendar) {
      calendar.checked = checked;
    });
  } else {
    findCalendar(calendarId).checked = checked;

    allCheckedCalendars = calendarElements.every(function(input) {
      return input.checked;
    });

    if (allCheckedCalendars) {
      viewAll.checked = true;
    } else {
      viewAll.checked = false;
    }
  }

  refreshScheduleVisibility();
}

function refreshScheduleVisibility() {
  var calendarElements = Array.prototype.slice.call(
    document.querySelectorAll("#calendarList input")
  );

  CalendarList.forEach(function(calendar) {
    cal.toggleSchedules(calendar.id, !calendar.checked, false);
  });

  cal.render(true);

  calendarElements.forEach(function(input) {
    var span = input.nextElementSibling;
    span.style.backgroundColor = input.checked
      ? span.style.borderColor
      : "transparent";
  });
}


cal.on({
  clickTimezonesCollapseBtn: function(timezonesCollapsed) {
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

init();
