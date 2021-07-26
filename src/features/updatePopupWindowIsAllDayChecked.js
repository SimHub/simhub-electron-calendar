/*
 * refresh updatePopupWindow if isAllDay is checked/unchecked
 *
 */
export function updatePopupWindowIsAllDayChecked(cal, _e) {
  let triggerEventName = _e.hasOwnProperty("triggerEventName");
  setTimeout(() => {
    $(".tui-full-calendar-popup .tui-full-calendar-section-allday").on(
      "click",
      function () {
        let checked = $("#tui-full-calendar-schedule-allday").prop("checked");
        ///### Check type popupwindow updatePopupWindow or createNewPopupWindow ###///
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
          ////### instand update updatePopupWindow to show/hide timepicker if isAllday checked/unchecked ###////
          // cal.render();
          cal._showCreationPopup(newSchedule);
        }
      }
    );
  }, 100);
}
