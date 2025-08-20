sap.ui.define([], () => {
  "use strict";

  return {
    formatText(sValue, sPath) {
      if (!sValue) {
        return "";
      }
      return `(Данные из (${sPath}) - ${sValue})`;
    },
  };
});
