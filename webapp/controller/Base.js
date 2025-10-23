sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "com/segezha/form/mpr/model/formatter",
  ],
  (Controller, Fragment, MessageBox, formatter) => {
    "use strict";
    return Controller.extend("com.segezha.form.mpr.controller.Base", {
      formatter: formatter,
      getOwnerComponent() {
        return Controller.prototype.getOwnerComponent.call(this);
      },
      getRouter() {
        return UIComponent.getRouterFor(this);
      },
      getModel(sName) {
        const model = this.getView().getModel(sName);
        if (model) return model;
        else return this.getOwnerComponent().getModel(sName);
      },
      setModel(oModel, sName) {
        this.getView().setModel(oModel, sName);
        return this;
      },
      readOData: function (sPath, oParams) {
        return new Promise((resolve, reject) => {
          const oModel = this.getModel();
          oModel.read(sPath, {
            urlParameters: oParams ? oParams.urlParameters : null,
            filters: oParams ? oParams.filters : null,
            sorters: oParams ? oParams.sorters : null,
            success: function (oData) {
              resolve(oData);
            },
            error: function (oError) {
              reject(oError);
            },
          });
        });
      },
      setDate: function (oModel) {
        if (oModel) {
          const oData = oModel.getData();

          if (
            oData.DataFrom === undefined ||
            oData.DataFrom === null ||
            oData.DataFrom === ""
          ) {
            const oToday = new Date();
            oToday.setHours(0, 0, 0, 0);
            oModel.setProperty("/DataFrom", oToday);
          }

          if (
            oData.DataTo === undefined ||
            oData.DataTo === null ||
            oData.DataTo === ""
          ) {
            const oMaxDate = new Date(9999, 11, 31);
            oModel.setProperty("/DataTo", oMaxDate);
          }
          oModel.refresh();
        }
      },
    });
  }
);
