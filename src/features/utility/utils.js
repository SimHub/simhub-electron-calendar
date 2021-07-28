export function reminderDropdownListStyle(ul) {
  const ulChildren = [ul][0].children;
  // console.log(ulChildren);
  for (let i = 0; i < ulChildren.length; i++) {
    // console.log(ulChildren[i]);
    ulChildren[i].style.width = "100%";
    ulChildren[i].children[0].style.width = "0px";
    ulChildren[i].children[1].style.width = "100%";
  }
}

export function triggerEventName(e) {
  return e.hasOwnProperty("triggerEventName");
}
