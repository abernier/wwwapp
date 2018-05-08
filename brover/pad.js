function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

this.pad = pad;
if (typeof module !== "undefined" && module !== null) {
  module.exports = this.pad;
}