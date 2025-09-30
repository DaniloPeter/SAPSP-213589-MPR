sap.ui.define(
  [
    "com/segezha/form/mpr/controller/Base",
    "sap/m/MessageBox",
    "sap/m/Label",
    "sap/ui/table/Column",
    "sap/m/Text",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
  ],
  (
    BaseController,
    MessageBox,
    Label,
    UIColumn,
    Text,
    Filter,
    FilterOperator
  ) => {
    "use strict";

    return BaseController.extend("com.segezha.form.mpr.controller.Home", {
      onInit() {
        this.loadAllData();
      },

      async loadAllData() {
        const dataConfigs = [
          { entitySet: "/VHIncotermsSet", modelName: "incoterms" },
          { entitySet: "/GPSet", modelName: "gp" },
          { entitySet: "/VHPurchaserSet", modelName: "purchaser" },
          { entitySet: "/VHPaymentTermsSet", modelName: "payment" },
        ];

        try {
          const promises = dataConfigs.map((config) =>
            this.readOData(config.entitySet)
          );

          const results = await Promise.all(promises);

          results.forEach((data, index) => {
            const model = this.getModel(dataConfigs[index].modelName);
            if (model) {
              model.setData(data);
            }
          });

          if (!this.getModel("data")) {
            const oDataModel = new sap.ui.model.json.JSONModel({
              userType: 0,
              selectedIncotermId: "",
              selectedIncotermText: "",
              lastName: "",
              purchaserData: [],
            });
            this.getView().setModel(oDataModel, "data");
          }

          this.initPurchaserTable();
        } catch (oError) {
          console.error("Error loading data", oError);
        }
      },

      initPurchaserTable() {
        const purchaserModel = this.getModel("purchaser");
        if (purchaserModel && purchaserModel.getData()) {
          const purchaserData = purchaserModel.getData().results || [];

          const dataModel = this.getModel("data");
          if (dataModel) {
            dataModel.setProperty("/purchaserData", purchaserData);
          }
        }
      },

      onSearchOrganization: function () {
        if (!this._oIncotermsDialog) {
          this._oIncotermsDialog = sap.ui.xmlfragment(
            "com.segezha.form.mpr.view.fragments.VHIncoterms",
            this
          );
          this.getView().addDependent(this._oIncotermsDialog);
        }

        var oIncotermsModel = this.getModel("incoterms");
        var aIncoterms = oIncotermsModel.getData().results || [];

        this._oIncotermsDialog.getTableAsync().then(
          function (oTable) {
            oTable.setModel(oIncotermsModel);

            if (oTable.getColumns) {
              var aColumns = oTable.getColumns();
              for (var i = aColumns.length - 1; i >= 0; i--) {
                oTable.removeColumn(aColumns[i]);
                aColumns[i].destroy();
              }
            }

            if (oTable.bindRows) {
              var oColumnID = new UIColumn({
                label: new Label({ text: "Код" }),
                template: new Text({ wrapping: false, text: "{ID}" }),
              });
              oColumnID.data({ fieldName: "ID" });
              oTable.addColumn(oColumnID);

              var oColumnText = new UIColumn({
                label: new Label({ text: "Описание" }),
                template: new Text({ wrapping: false, text: "{Text}" }),
              });
              oColumnText.data({ fieldName: "Text" });
              oTable.addColumn(oColumnText);

              oTable.bindAggregation("rows", {
                path: "/results",
                events: {
                  dataReceived: function () {
                    this._oIncotermsDialog.update();
                  }.bind(this),
                },
              });
            }

            // Для mobile таблицы (sap.m.Table)
            if (oTable.bindItems) {
              if (oTable.removeAllColumns) {
                oTable.removeAllColumns();
              }

              oTable.addColumn(
                new sap.m.Column({ header: new Label({ text: "Код" }) })
              );
              oTable.addColumn(
                new sap.m.Column({ header: new Label({ text: "Описание" }) })
              );

              oTable.bindAggregation("items", {
                path: "/results",
                template: new sap.m.ColumnListItem({
                  cells: [
                    new Text({ text: "{ID}" }),
                    new Text({ text: "{Text}" }),
                  ],
                }),
                events: {
                  dataReceived: function () {
                    this._oIncotermsDialog.update();
                  }.bind(this),
                },
              });
            }
          }.bind(this)
        );

        this._oIncotermsDialog.open();
      },

      onFilterBarSearch: function (oEvent) {
        var sSearchQuery = oEvent.getSource().getBasicSearchValue();
        var aSelectionSet = oEvent.getParameter("selectionSet");

        var aFilters = [];

        if (aSelectionSet) {
          aFilters = aSelectionSet.reduce(function (aResult, oControl) {
            if (oControl.getValue()) {
              aResult.push(
                new Filter({
                  path: oControl.getName(),
                  operator: FilterOperator.Contains,
                  value1: oControl.getValue(),
                })
              );
            }
            return aResult;
          }, []);
        }

        if (sSearchQuery) {
          aFilters.push(
            new Filter({
              filters: [
                new Filter({
                  path: "ID",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
                new Filter({
                  path: "Text",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
              ],
              and: false,
            })
          );
        }

        this._filterTable(
          new Filter({
            filters: aFilters,
            and: true,
          })
        );
      },

      _filterTable: function (oFilter) {
        this._oIncotermsDialog.getTableAsync().then(
          function (oTable) {
            if (oTable.bindRows) {
              oTable.getBinding("rows").filter(oFilter);
            }
            if (oTable.bindItems) {
              oTable.getBinding("items").filter(oFilter);
            }
            this._oIncotermsDialog.update();
          }.bind(this)
        );
      },

      onValueHelpOkPress: function (oEvent) {
        var aTokens = oEvent.getParameter("tokens");
        if (aTokens && aTokens.length > 0) {
          var oToken = aTokens[0];
          var sSelectedKey = oToken.getKey();
          var sSelectedText = oToken.getText();

          var oSelectedModel = this.getModel("data");
          if (oSelectedModel) {
            oSelectedModel.setProperty("/selectedIncotermId", sSelectedKey);
            oSelectedModel.setProperty("/selectedIncotermText", sSelectedText);
          }
        }
        this._oIncotermsDialog.close();
      },

      onValueHelpCancelPress: function () {
        this._oIncotermsDialog.close();
      },

      onUserTypeChange: function (oEvent) {
        var iSelectedIndex = oEvent.getParameter("selectedIndex");
        var oDataModel = this.getModel("data");

        if (oDataModel && iSelectedIndex === 0) {
          oDataModel.setProperty("/lastName", "");
        }
      },

      onDateFromChange: function (oEvent) {
        const oDatePicker = oEvent.getSource();
        const oBindingContext = oDatePicker.getBindingContext("data");

        if (oBindingContext) {
          const sPath = oBindingContext.getPath();
          const oDataModel = this.getModel("data");
          const oDate = oDatePicker.getDateValue();

          if (oDate && oDataModel) {
            oDataModel.setProperty(sPath + "/DateFrom", oDate);
          }
        }
      },

      onDateToChange: function (oEvent) {
        const oDatePicker = oEvent.getSource();
        const oBindingContext = oDatePicker.getBindingContext("data");

        if (oBindingContext) {
          const sPath = oBindingContext.getPath();
          const oDataModel = this.getModel("data");
          const oDate = oDatePicker.getDateValue();

          if (oDate && oDataModel) {
            oDataModel.setProperty(sPath + "/DateTo", oDate);
          }
        }
      },

      onSendPurchaser: function () {
        const oDataModel = this.getModel("data");
        if (!oDataModel) return;

        const purchaserData = oDataModel.getProperty("/purchaserData") || [];

        if (purchaserData.length === 0) {
          MessageBox.warning("Нет данных для отправки");
          return;
        }

        this.sendPurchaserData(purchaserData);
      },

      async sendPurchaserData(purchaserData) {
        try {
          const oModel = this.getOwnerComponent().getModel();

          for (const purchaser of purchaserData) {
            if (purchaser.ID) {
              await new Promise((resolve, reject) => {
                oModel.update(
                  "/VHPurchaserSet('" + purchaser.ID + "')",
                  purchaser,
                  {
                    success: resolve,
                    error: reject,
                  }
                );
              });
            } else {
              await new Promise((resolve, reject) => {
                oModel.create("/VHPurchaserSet", purchaser, {
                  success: resolve,
                  error: reject,
                });
              });
            }
          }

          MessageBox.success("Данные успешно отправлены");
          this.loadAllData();
        } catch (oError) {
          console.error("Error sending purchaser ", oError);
          MessageBox.error("Ошибка при отправке данных: " + oError.message);
        }
      },
    });
  }
);
