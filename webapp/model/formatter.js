sap.ui.define([], () => {
  "use strict";

  return {
    formatText(sValue, sPath) {
      if (!sValue) {
        return "";
      }
      return `(Данные из (${sPath}) - ${sValue})`;
    },
    boolToIndex: function (bValue) {
      return bValue ? 1 : 0;
    },
    indexToBool: function (iIndex) {
      return iIndex === 1;
    },
    combineNames: function (mcName, testMcName) {
      debugger;
      return mcName + " " + testMcName;
    },
  };
});
