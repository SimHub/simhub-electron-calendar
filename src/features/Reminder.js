import { Notification } from "electron";
import moment from "moment";
const storage = require("electron-json-storage");

export default class Reminder {
  constructor() {
    this.helper = new Reminder();
  }

  static activate() {
    // var _date = moment().toISOString(true).slice(0, -8);
    var _date = moment().toISOString(true).slice(0, -13);
    //
    storage.getAll(function (error, data) {
      if (error) throw error;
      delete data.calendar;
      Object.values(data).forEach((i) => {
        if (i.end !== undefined) {
          let nDate = i.reminderDate;

          if (i.reminderIsSet) {
            console.log(nDate, _date);
            // console.log(moment(_date), moment(nDate));
            // console.log(moment(_date).isSame(nDate));
            if (moment(_date).isSame(nDate)) {
              // console.log("REMINDER IS ACTIVE: ", i.reminderIsActive);
              storage.get("reminder_" + i.id, function (error, data) {
                if (error) throw error;

                // console.log("DATA: ", data);
                if (!data.reminderIsActive) {
                  Reminder.notify(nDate, i.title);
                  ////set storage reminderIsActive to true
                  storage.set("reminder_" + i.id, {
                    id: i.id,
                    reminderIsActive: true,
                  });
                }
              });
            }
          }
        }
      });
    });

    setTimeout(this.activate.bind(this), 1000);
  }

  static notificationReminderSelection(
    storage = "",
    id = "",
    typeofpopup = ""
  ) {
    const popup = document.querySelector(".tui-full-calendar-popup");
    const popupContainer = document.querySelector(
      ".tui-full-calendar-popup-container"
    );
    const stateSection = document.querySelector(
      ".tui-full-calendar-popup-section.tui-full-calendar-dropdown.tui-full-calendar-close.tui-full-calendar-section-state"
    );
    const closeBtn = document.querySelector(
      ".tui-full-calendar-button.tui-full-calendar-popup-close"
    );

    const reminderStateSection = document.createElement("div");
    reminderStateSection.classList.add(
      "tui-full-calendar-popup-section",
      "tui-full-calendar-dropdown",
      "tui-full-calendar-close",
      "tui-full-calendar-section-state"
    );

    const button = document.createElement("button");
    button.id = "reminderBtn";
    button.classList.add(
      "tui-full-calendar-button",
      "tui-full-calendar-dropdown-button",
      "tui-full-calendar-popup-section-item"
    );
    button.style.whiteSpace = "nowrap";
    button.style.overflow = "hidden";
    button.style.textOverflow = "ellipsis";
    // console.log(popup, popupContainer, stateSection);

    const ul = document.createElement("ul");
    ul.classList.add("tui-full-calendar-dropdown-menu");
    ul.style.width = "175px";
    // console.log([ul][0].children);
    ul.innerHTML = `
         <li class="tui-full-calendar-popup-section-item tui-full-calendar-dropdown-menu-item">
       <span class="tui-full-calendar-icon tui-full-calendar-none"></span>
                <span class="tui-full-calendar-content">No Reminder</span>
                </li>

       <li class="tui-full-calendar-popup-section-item tui-full-calendar-dropdown-menu-item">
       <span class="tui-full-calendar-icon tui-full-calendar-none"></span>
                <span class="tui-full-calendar-content">Event start</span>
                </li>
                <li class="tui-full-calendar-popup-section-item tui-full-calendar-dropdown-menu-item">
                <span class="tui-full-calendar-icon tui-full-calendar-none"></span>
                <span class="tui-full-calendar-content">30 Min. before</span>
                </li>
                <li class="tui-full-calendar-popup-section-item tui-full-calendar-dropdown-menu-item">
                <span class="tui-full-calendar-icon tui-full-calendar-none"></span>
                <span class="tui-full-calendar-content">1 Hour before</span>
                </li>
                <li class="tui-full-calendar-popup-section-item tui-full-calendar-dropdown-menu-item">
                <span class="tui-full-calendar-icon tui-full-calendar-none"></span>
                <span class="tui-full-calendar-content">1 Day before</span>
                </li>
  `;

    reminderStateSection.appendChild(button);
    reminderStateSection.appendChild(ul);
    popupContainer.insertBefore(reminderStateSection, closeBtn);

    const ulChildren = [ul][0].children;
    // console.log(ulChildren);
    for (let i = 0; i < ulChildren.length; i++) {
      // console.log(ulChildren[i]);
      ulChildren[i].style.width = "100%";
      ulChildren[i].children[0].style.width = "0px";
      ulChildren[i].children[1].style.width = "100%";
    }

    if (typeofpopup === "Update") {
      if (storage !== "" && id !== "") {
        storage.get(id, function (error, data) {
          if (error) throw error;
          // console.log("pupopUpdate Button: ", data.reminder);
          let reminderBtn = data.reminder;
          if (data.reminder === "") reminderBtn = "Reminder";
          document.querySelector("button#reminderBtn").innerHTML = `
  <span class="tui-full-calendar-icon tui-full-calendar-ic-alarm"></span>
  <span id="tui-full-calendar-schedule-state" class="tui-full-calendar-content reminder">${reminderBtn}</span>
  <span class="tui-full-calendar-icon tui-full-calendar-dropdown-arrow"></span></button>
`;
        });
      }
    } else {
      document.querySelector("button#reminderBtn").innerHTML = `
  <span class="tui-full-calendar-icon tui-full-calendar-ic-alarm"></span>
  <span id="tui-full-calendar-schedule-state" class="tui-full-calendar-content reminder">Reminder</span>
  <span class="tui-full-calendar-icon tui-full-calendar-dropdown-arrow"></span></button>
`;
    }
  }

  static getReminder() {
    const reminderBtn = document.querySelector("#reminderBtn");
    let txt = reminderBtn.children[1].innerText;
    // console.log(reminderBtn.children[1].innerText);
    if (txt === "Reminder" || txt === "No Reminder") {
      return "";
    } else {
      return txt;
    }
  }

  static reminderDate(date, func) {
    let _date = moment(date._date).toISOString(true).slice(0, -13);
    // console.log("FUNC: ", func);
    if (func === "No Reminder" || func === "Reminder" || func === "-----") {
      // console.log(false);
      return "";
    }
    if (func === "Event start") {
      // console.log(_date);
      return _date;
    }
    if (func === "30 Min. before") {
      return Reminder.momentSubstract(date._date, 1800, "seconds");
    }
    if (func === "1 Hour before") {
      return Reminder.momentSubstract(date._date, 1, "hour");
    }
    if (func === "1 Day before") {
      // console.log(Reminder.momentSubstract(date._date, 1, "day"));
      return Reminder.momentSubstract(date._date, 1, "day");
    }
  }

  static reminderIsSet(func) {
    if (func === "No Reminder" || func === "Reminder") {
      return false;
    }
    if (func === "Event start") {
      return true;
    }
    if (func === "30 Min. before") {
      return true;
    }
    if (func === "1 Hour before") {
      return true;
    }
    if (func === "1 Day before") {
      return true;
    }
  }

  static showReminderOnEditPopup(storage, id) {
    // console.log(storage, id);
    const tuiFullCalendarSectionDetail = document.querySelector(
      ".tui-full-calendar-section-detail"
    );
    const item = document.createElement("div");
    item.classList.add("tui-full-calendar-popup-detail-item");
    storage.get(id, function (error, data) {
      if (error) throw error;
      let reminder = data.reminder;
      // console.log(data);
      item.innerHTML = `
<div class="tui-full-calendar-popup-detail-item">
                <span class="tui-full-calendar-icon tui-full-calendar-ic-alarm" style="width: 15px;height: 15px;margin-right:0px"></span>
<span class="tui-full-calendar-content">Reminder: <span style="color:brown"> ${reminder}</span></span></div>
  `;
      tuiFullCalendarSectionDetail.appendChild(item);
    });
  }

  /*
   * refresh updatePopupWindow if isAllDay is checked/unchecked
   */
  static updatePopupWindowIsAllDayChecked(cal, _e) {
    let triggerEventName = _e.hasOwnProperty("triggerEventName");
    setTimeout(() => {
      $(".tui-full-calendar-popup .tui-full-calendar-section-allday").on(
        "click",
        function () {
          let checked = $("#tui-full-calendar-schedule-allday").prop("checked");
          // Check type popupwindow updatePopupWindow or createNewPopupWindow
          if (!triggerEventName) {
            cal.updateSchedule(_e.id, _e.selectedCal.id, {
              isAllDay: !checked,
            });

            let updateScheduleData = cal.getSchedule(_e.id, _e.selectedCal.id);
            let newSchedule = {
              calendar: _e.selectedCal,
              changes: JSON.stringify(updateScheduleData._changed),
              end: updateScheduleData.end,
              schedule: updateScheduleData,
              start: updateScheduleData.start,
              triggerEventName: updateScheduleData.triggerEventName,
            };
            // instand update updatePopupWindow to show/hide timepicker if isAllday checked/unchecked
            // cal.render();
            cal._showCreationPopup(newSchedule);
          }
        }
      );
    }, 100);
  }

  //Helper Func
  static momentSubstract(date, time1, time2) {
    let _oldDate = moment(date).subtract(time1, time2);
    let _newDate = moment(_oldDate._d).toISOString(true).slice(0, -13);
    // console.log(_newDate);
    return _newDate;
  }

  static notify(date, title) {
    // console.log("NOTIFY");
    let _n = new Notification({
      title: title,
      body: date,
    });
    return _n.show();
  }
} // End Class
