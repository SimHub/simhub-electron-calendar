export const reminderDropdownIsNotAllDay = `
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

export const reminderDropdownIsAllDay = `
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
                <span class="tui-full-calendar-content">1 Day before</span>
                </li>
  `;

export const reminderDropdownDynamicBtnValue = (reminderBtn) => {
  return `<span class="tui-full-calendar-icon tui-full-calendar-ic-alarm"></span>
  <span id="tui-full-calendar-schedule-state" class="tui-full-calendar-content reminder">${reminderBtn}</span>
  <span class="tui-full-calendar-icon tui-full-calendar-dropdown-arrow"></span></button>
    `;
};

export const reminderDropdownBtnValue = ` <span class="tui-full-calendar-icon tui-full-calendar-ic-alarm"></span>
  <span id="tui-full-calendar-schedule-state" class="tui-full-calendar-content reminder">Reminder</span>
  <span class="tui-full-calendar-icon tui-full-calendar-dropdown-arrow"></span></button>
`;
