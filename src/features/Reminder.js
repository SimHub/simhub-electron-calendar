import { Notification } from "electron";
import moment from "moment";
import {
  reminderDropdownIsAllDay,
  reminderDropdownIsNotAllDay,
  reminderDropdownBtnValue,
  reminderDropdownDynamicBtnValue,
} from "./template/reminderDropdown.js";
import { reminderDropdownListStyle } from "./utility/utils.js";
const storage = require("electron-json-storage");

export default class Reminder {
  constructor() {
    this.helper = new Reminder();
  }

  static activate() {
    storage.getAll(function (error, data) {
      if (error) throw error;
      delete data.calendar;
      Object.values(data).forEach((i) => {
        if (i.end !== undefined) {
          let _date = i.isAllDay
            ? moment().toISOString(true).slice(0, -19)
            : moment().toISOString(true).slice(0, -13);
          let nDate = i.isAllDay ? i.reminderDate.slice(0, -6) : i.reminderDate;
          if (i.reminderIsSet) {
            // console.log(nDate, _date);
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

  static notificationReminderSelection(e = "", typeofpopup = "") {
    setTimeout(() => {
      console.log("ID: ", e.id);
      console.log("E: ", e);
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
      ul.classList.add("tui-full-calendar-dropdown-menu", "reminderDropdown");
      ul.style.width = "175px";
      // console.log([ul][0].children);
      ul.innerHTML = Reminder.reminderDropdownIsAllDay(e.isAllDay);
      reminderStateSection.appendChild(button);
      reminderStateSection.appendChild(ul);
      popupContainer.insertBefore(reminderStateSection, closeBtn);
      //### li styling
      reminderDropdownListStyle(ul);
      if (typeofpopup.toUpperCase() === "UPDATE") {
        console.log("TYPEOFPOPUP: ", typeofpopup.toUpperCase());
        if (storage !== "" && e !== "") {
          storage.get(e.id, function (error, data) {
            if (error) throw error;
            console.log("pupopUpdate Button: ", data.reminder);
            let reminderBtn = data.reminder;
            if (data.reminder === "") reminderBtn = "Reminder";
            document.querySelector(
              "button#reminderBtn"
            ).innerHTML = reminderDropdownDynamicBtnValue(reminderBtn);
          });
        }
      } else {
        document.querySelector(
          "button#reminderBtn"
        ).innerHTML = reminderDropdownBtnValue;
      }
    }, 100);
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

  static reminderDropdownIsAllDay(isAllDay) {
    if (isAllDay) {
      return reminderDropdownIsAllDay;
    } else {
      return reminderDropdownIsNotAllDay;
    }
  }
} // End Class
