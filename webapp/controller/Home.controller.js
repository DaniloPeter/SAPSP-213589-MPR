sap.ui.define(
  [
    "com/segezha/form/mpr/controller/Base",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Label",
    "sap/m/SearchField",
    "sap/ui/table/Column",
    "sap/m/Text",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
  ],
  (
    BaseController,
    MessageBox,
    MessageToast,
    Label,
    SearchField,
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
          {
            entitySet: "/VHIncotermsSet",
            modelName: "incoterms",
          },
          { entitySet: "/GPSet", modelName: "gp" },
          {
            entitySet: "/VHPaymentTermsSet",
            modelName: "payment",
          },
        ];

        try {
          const promises = dataConfigs.map((config) =>
            this.loadData(config.entitySet)
          );

          const results = await Promise.all(promises);

          results.forEach((data, index) => {
            this.updateModel(dataConfigs[index].modelName, data);
          });
        } catch (oError) {
          console.error("Error loading data", oError);
        }
      },

      loadData(entitySet) {
        return this.readOData(entitySet);
      },

      updateModel(modelName, data) {
        const model = this.getModel(modelName);
        if (model) {
          model.setData(data);
          console.log(modelName, data);
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

        // Устанавливаем модель с данными
        var aIncoterms = this.getModel("incoterms").getData().results || [];
        var oModel = new sap.ui.model.json.JSONModel(aIncoterms);

        this._oIncotermsDialog.getTableAsync().then(
          function (oTable) {
            oTable.setModel(oModel);

            // Очищаем существующие столбцы перед добавлением новых
            if (oTable.getColumns) {
              var aColumns = oTable.getColumns();
              for (var i = aColumns.length - 1; i >= 0; i--) {
                oTable.removeColumn(aColumns[i]);
                aColumns[i].destroy();
              }
            }

            // Для desktop таблицы (sap.ui.table.Table)
            if (oTable.bindRows) {
              // Добавляем колонки
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

              // Биндим данные
              oTable.bindAggregation("rows", {
                path: "/",
                events: {
                  dataReceived: function () {
                    this._oIncotermsDialog.update();
                  }.bind(this),
                },
              });
            }

            // Для mobile таблицы (sap.m.Table)
            if (oTable.bindItems) {
              // Очищаем существующие колонки
              if (oTable.removeAllColumns) {
                oTable.removeAllColumns();
              }

              // Добавляем колонки
              oTable.addColumn(
                new MColumn({ header: new Label({ text: "Код" }) })
              );
              oTable.addColumn(
                new MColumn({ header: new Label({ text: "Описание" }) })
              );

              // Биндим данные
              oTable.bindAggregation("items", {
                path: "/",
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
    });
  }
);
