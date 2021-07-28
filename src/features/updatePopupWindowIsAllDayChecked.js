import Reminder from "./Reminder.js";
import {
  reminderDropdownIsAllDay,
  reminderDropdownIsNotAllDay,
} from "./template/reminderDropdown.js";
import {
  reminderDropdownListStyle,
  triggerEventName,
} from "./utility/utils.js";

/*
 * refresh updatePopupWindow if isAllDay is checked/unchecked
 */
export function updatePopupWindowIsAllDayChecked(cal, _e) {
  setTimeout(() => {
    $(".tui-full-calendar-popup .tui-full-calendar-section-allday").on(
      "click",
      function () {
        const reminderDropdownMenu = document.querySelector(
          "ul.tui-full-calendar-dropdown-menu.reminderDropdown"
        );
        let checked = $("#tui-full-calendar-schedule-allday").prop("checked");
        console.log("REMINDER DROPDOWN: ", reminderDropdownMenu);
        console.log("CLICKED ISALLDAY ", checked);
        console.log("E: ", _e);
        ///### insert reminderDropdown
        reminderDropdownMenu.innerHTML = checked
          ? reminderDropdownIsNotAllDay
          : reminderDropdownIsAllDay;
        reminderDropdownListStyle(reminderDropdownMenu);
        ///### Check type popupwindow updatePopupWindow or createNewPopupWindow ###///
        if (!triggerEventName(_e)) {
          console.log("UPDATE SCHEDULE ISALLDAY");
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
          ////### instand update updatePopupWindow to show/hide timepicker if isAllday checked/unchecked ###////
          // cal.render();
          cal._showCreationPopup(newSchedule);

          ///### insert reminderDropdown
          // Reminder.notificationReminderSelection(_e, "Update");
          ////////////////////
        }
      }
    );
  }, 100);
}
