module.exports = {
  getPadStart: function(value) {
    value = value.toString();
    return value.padStart(2, "0");
  }
};
