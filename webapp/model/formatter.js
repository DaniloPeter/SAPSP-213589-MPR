sap.ui.define([], () => {
  "use strict";

  return {
    boolToIndex: function (bValue) {
      return bValue ? 1 : 0;
    },
    indexToBool: function (iIndex) {
      return iIndex === 1;
    },
    combineNames: function (mcName, testMcName) {
      return mcName + " " + testMcName;
    },
  };
});
