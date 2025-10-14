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
      _bAutoFilterApplied: false,

      async onInit() {
        const loadVH = async (sEntitySet, sModelName) => {
          try {
            const oData = await this.readOData(`/${sEntitySet}`);
            const aResults = (oData && oData.results) || [];
            const oModel = this.getModel(sModelName);
            if (oModel) {
              oModel.setProperty("/items", aResults);
            } else {
              this.getOwnerComponent().setModel(
                new sap.ui.model.json.JSONModel({ items: aResults }),
                sModelName
              );
            }
            console.info(`${sEntitySet} loaded:`, aResults.length);
          } catch (e) {
            console.warn(`Failed to load ${sEntitySet}:`, e);
            const oModel =
              this.getModel(sModelName) ||
              this.getOwnerComponent().getModel(sModelName);
            if (oModel) {
              oModel.setProperty("/items", []);
            }
          }
        };

        await Promise.all([
          loadVH("VHbukrsSet", "VHbukrs"),
          loadVH("VHWerksSet", "VHWerks"),
          loadVH("VHuserSet", "VHuser"),
        ]);
      },

      onSearchBukrs: function () {
        debugger;
        if (!this._oBukrsDialog) {
          this._oBukrsDialog = sap.ui.xmlfragment(
            "com.segezha.form.mpr.view.fragments.VHBukrs",
            this
          );
          this.getView().addDependent(this._oBukrsDialog);
        }
        const oBukrsModel =
          this.getModel("VHbukrs") ||
          this.getOwnerComponent().getModel("VHbukrs");
        this._oBukrsDialog.setModel(oBukrsModel);
        this._oBukrsDialog.getTableAsync().then(
          function (oTable) {
            if (oTable.getColumns) {
              const aColumns = oTable.getColumns() || [];
              for (let i = aColumns.length - 1; i >= 0; i--) {
                oTable.removeColumn(aColumns[i]);
                aColumns[i].destroy();
              }
              const oColCode = new UIColumn({
                label: new Label({ text: "Код" }),
                template: new Text({ wrapping: false, text: "{Bukrs}" }),
              });
              oTable.addColumn(oColCode);
              const oColName = new UIColumn({
                label: new Label({ text: "Наименование" }),
                template: new Text({ wrapping: false, text: "{Butxt}" }),
              });
              oTable.addColumn(oColName);
              const oColCity = new UIColumn({
                label: new Label({ text: "Город" }),
                template: new Text({ wrapping: false, text: "{Ort01}" }),
              });
              oTable.addColumn(oColCity);
              // bind rows for sap.ui.table.Table
              if (oTable.bindRows) {
                oTable.bindAggregation("rows", {
                  path: "/items",
                  events: {
                    dataReceived: function () {
                      this._oBukrsDialog.update();
                    }.bind(this),
                  },
                });
              }
            }
            // mobile table
            if (oTable.bindItems) {
              if (oTable.removeAllColumns) {
                oTable.removeAllColumns();
              }
              oTable.addColumn(
                new sap.m.Column({ header: new Label({ text: "Код" }) })
              );
              oTable.addColumn(
                new sap.m.Column({
                  header: new Label({ text: "Наименование" }),
                })
              );
              oTable.bindAggregation("items", {
                path: "/items",
                template: new sap.m.ColumnListItem({
                  cells: [
                    new Text({ text: "{Bukrs}" }),
                    new Text({ text: "{Butxt}" }),
                  ],
                }),
                events: {
                  dataReceived: function () {
                    this._oBukrsDialog.update();
                  }.bind(this),
                },
              });
            }
          }.bind(this)
        );
        this._oBukrsDialog.open();
      },
      onFilterBarSearchBukrs: function (oEvent) {
        debugger;
        const sSearchQuery = oEvent.getSource().getBasicSearchValue();
        const aSelectionSet = oEvent.getParameter("selectionSet");
        const aFilters = [];
        if (aSelectionSet) {
          aSelectionSet.forEach(function (oControl) {
            if (oControl.getValue && oControl.getValue()) {
              aFilters.push(
                new Filter({
                  path: oControl.getName(),
                  operator: FilterOperator.Contains,
                  value1: oControl.getValue(),
                })
              );
            }
          });
        }
        if (sSearchQuery) {
          aFilters.push(
            new Filter({
              filters: [
                new Filter({
                  path: "Bukrs",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
                new Filter({
                  path: "Butxt",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
              ],
              and: false,
            })
          );
        }
        this._filterBukrsTable(new Filter({ filters: aFilters, and: true }));
      },
      _filterBukrsTable: function (oFilter) {
        debugger;
        if (!this._oBukrsDialog) return;
        this._oBukrsDialog.getTableAsync().then(
          function (oTable) {
            if (oTable.bindRows) {
              const oBinding = oTable.getBinding("rows");
              if (oBinding) oBinding.filter(oFilter);
            }
            if (oTable.bindItems) {
              const oBinding = oTable.getBinding("items");
              if (oBinding) oBinding.filter(oFilter);
            }
            this._oBukrsDialog.update();
          }.bind(this)
        );
      },
      onBukrsOkPress: function (oEvent) {
        debugger;
        const aTokens = oEvent.getParameter("tokens");
        // ValueHelpDialog with single selection returns tokens; if using table selection, use getSelectedContexts
        let sKey = null;
        let sText = null;
        if (aTokens && aTokens.length > 0) {
          sKey = aTokens[0].getKey();
          sText = aTokens[0].getText();
        } else {
          // try selected contexts
          const aContexts = oEvent.getParameter("selectedContexts") || [];
          if (aContexts.length > 0) {
            const oCtx = aContexts[0];
            const oData = oCtx.getObject();
            sKey = oData.Bukrs;
            sText = oData.Butxt;
          }
        }
        if (sKey) {
          const oRequestModel = this.getModel("Request_data");
          if (oRequestModel) {
            oRequestModel.setProperty("/Bukrs", sKey);
            oRequestModel.setProperty("/Butxt", sText);
            oRequestModel.setProperty("/Werks", "");
            oRequestModel.setProperty("/Name1", "");
            oRequestModel.setProperty("/Ort01", "");
            oRequestModel.setProperty("/Land1", "");
          }
        }
        if (this._oBukrsDialog) this._oBukrsDialog.close();
      },
      onBukrsCancelPress: function () {
        debugger;
        if (this._oBukrsDialog) this._oBukrsDialog.close();
      },
      // это werks или Завод
      onSearchWerks: function () {
        debugger;
        if (!this._oWerksDialog) {
          this._oWerksDialog = sap.ui.xmlfragment(
            "com.segezha.form.mpr.view.fragments.VHWerks",
            this
          );
          this.getView().addDependent(this._oWerksDialog);
        }
        const oWerksModel =
          this.getModel("VHWerks") ||
          this.getOwnerComponent().getModel("VHWerks");
        this._oWerksDialog.setModel(oWerksModel);

        const oRequestModel = this.getModel("Request_data");
        let sBukrsValue = "";
        if (oRequestModel) {
          sBukrsValue = oRequestModel.getProperty("/Bukrs") || "";
        }

        this._oWerksDialog.getTableAsync().then(
          function (oTable) {
            if (oTable.getColumns) {
              const aColumns = oTable.getColumns() || [];
              for (let i = aColumns.length - 1; i >= 0; i--) {
                oTable.removeColumn(aColumns[i]);
                aColumns[i].destroy();
              }
              oTable.addColumn(
                new UIColumn({
                  label: new Label({ text: "Организация (BU)" }),
                  template: new Text({ wrapping: false, text: "{Bukrs}" }),
                })
              );
              oTable.addColumn(
                new UIColumn({
                  label: new Label({ text: "Код завода" }),
                  template: new Text({ wrapping: false, text: "{Werks}" }),
                })
              );
              oTable.addColumn(
                new UIColumn({
                  label: new Label({ text: "Наименование" }),
                  template: new Text({ wrapping: false, text: "{Name1}" }),
                })
              );
              oTable.addColumn(
                new UIColumn({
                  label: new Label({ text: "Город" }),
                  template: new Text({ wrapping: false, text: "{Ort01}" }),
                })
              );
              oTable.addColumn(
                new UIColumn({
                  label: new Label({ text: "Страна" }),
                  template: new Text({ wrapping: false, text: "{Land1}" }),
                })
              );

              if (oTable.bindRows) {
                let aInitialFilters = [];
                if (sBukrsValue) {
                  aInitialFilters.push(
                    new Filter({
                      path: "Bukrs",
                      operator: FilterOperator.EQ,
                      value1: sBukrsValue,
                    })
                  );
                }

                oTable.bindAggregation("rows", {
                  path: "/items",
                  filters:
                    aInitialFilters.length > 0 ? aInitialFilters : undefined,
                  events: {
                    dataReceived: function () {
                      this._oWerksDialog.update();
                    }.bind(this),
                  },
                });
              }
            }
            // mobile table
            if (oTable.bindItems) {
              if (oTable.removeAllColumns) {
                oTable.removeAllColumns();
              }
              oTable.addColumn(
                new sap.m.Column({
                  header: new Label({ text: "Организация (BU)" }),
                })
              );
              oTable.addColumn(
                new sap.m.Column({ header: new Label({ text: "Код завода" }) })
              );
              oTable.addColumn(
                new sap.m.Column({
                  header: new Label({ text: "Наименование" }),
                })
              );
              oTable.addColumn(
                new sap.m.Column({ header: new Label({ text: "Город" }) })
              );
              oTable.addColumn(
                new sap.m.Column({ header: new Label({ text: "Страна" }) })
              );

              let aInitialFilters = [];
              if (sBukrsValue) {
                aInitialFilters.push(
                  new Filter({
                    path: "Bukrs",
                    operator: FilterOperator.EQ,
                    value1: sBukrsValue,
                  })
                );
              }

              oTable.bindAggregation("items", {
                path: "/items",
                filters:
                  aInitialFilters.length > 0 ? aInitialFilters : undefined,
                template: new sap.m.ColumnListItem({
                  cells: [
                    new Text({ text: "{Bukrs}" }),
                    new Text({ text: "{Werks}" }),
                    new Text({ text: "{Name1}" }),
                    new Text({ text: "{Ort01}" }),
                    new Text({ text: "{Land1}" }),
                  ],
                }),
                events: {
                  dataReceived: function () {
                    this._oWerksDialog.update();
                  }.bind(this),
                },
              });
            }
          }.bind(this)
        );
        this._oWerksDialog.open();
      },
      // завод
      onFilterBarSearchWerks: function (oEvent) {
        const sSearchQuery = oEvent.getSource().getBasicSearchValue();
        const aSelectionSet = oEvent.getParameter("selectionSet");
        const aFilters = [];

        const oRequestModel = this.getModel("Request_data");
        let sBukrsValue = "";
        if (oRequestModel) {
          sBukrsValue = oRequestModel.getProperty("/Bukrs") || "";
        }
        if (
          sBukrsValue &&
          !sSearchQuery &&
          (!aSelectionSet ||
            aSelectionSet.length === 0 ||
            !aSelectionSet.some(
              (control) => control.getValue && control.getValue()
            ))
        ) {
          aFilters.push(
            new Filter({
              path: "Bukrs",
              operator: FilterOperator.EQ,
              value1: sBukrsValue,
            })
          );
        }

        if (aSelectionSet) {
          aSelectionSet.forEach(function (oControl) {
            if (oControl.getValue && oControl.getValue()) {
              aFilters.push(
                new Filter({
                  path: oControl.getName(),
                  operator: FilterOperator.Contains,
                  value1: oControl.getValue(),
                })
              );
            }
          });
        }
        if (sSearchQuery) {
          aFilters.push(
            new Filter({
              filters: [
                new Filter({
                  path: "Werks",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
                new Filter({
                  path: "Name1",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
                new Filter({
                  path: "Ort01",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
                new Filter({
                  path: "Land1",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
              ],
              and: false,
            })
          );
        }
        this._filterWerksTable(new Filter({ filters: aFilters, and: true }));
      },
      // завод
      _filterWerksTable: function (oFilter) {
        if (!this._oWerksDialog) return;
        this._oWerksDialog.getTableAsync().then(
          function (oTable) {
            let oBinding;
            if (oTable.bindRows) {
              oBinding = oTable.getBinding("rows");
            } else if (oTable.bindItems) {
              oBinding = oTable.getBinding("items");
            }
            if (oBinding) {
              oBinding.filter(oFilter);
            }
            this._oWerksDialog.update();
          }.bind(this)
        );
      },
      // завод
      onWerksOkPress: function (oEvent) {
        const aTokens = oEvent.getParameter("tokens");
        let sWerks = null;
        let sName1 = null;
        let sOrt01 = null;
        let sLand1 = null;
        let sBukrs = null;

        if (aTokens && aTokens.length > 0) {
          sWerks = aTokens[0].getKey();
          sName1 = aTokens[0].getText();

          const oVHWerksModel =
            this.getModel("VHWerks") ||
            this.getOwnerComponent().getModel("VHWerks");
          if (oVHWerksModel) {
            const aWerksItems = oVHWerksModel.getProperty("/items") || [];
            const oSelectedWerks = aWerksItems.find(
              (item) => item.Werks === sWerks
            );
            if (oSelectedWerks) {
              sBukrs = oSelectedWerks.Bukrs;
              sName1 = oSelectedWerks.Name1;
              sOrt01 = oSelectedWerks.Ort01;
              sLand1 = oSelectedWerks.Land1;
            }
          }
        } else {
          const aContexts = oEvent.getParameter("selectedContexts") || [];
          if (aContexts.length > 0) {
            const oData = aContexts[0].getObject();
            sWerks = oData.Werks;
            sName1 = oData.Name1;
            sOrt01 = oData.Ort01;
            sLand1 = oData.Land1;
            sBukrs = oData.Bukrs;
          }
        }
        if (sWerks) {
          const oRequestModel = this.getModel("Request_data");
          if (oRequestModel) {
            oRequestModel.setProperty("/Werks", sWerks);
            oRequestModel.setProperty("/Name1", sName1);
            oRequestModel.setProperty("/Ort01", sOrt01);
            oRequestModel.setProperty("/Land1", sLand1);

            if (sBukrs) {
              oRequestModel.setProperty("/Bukrs", sBukrs);

              const oVHBukrsModel =
                this.getModel("VHbukrs") ||
                this.getOwnerComponent().getModel("VHbukrs");
              if (oVHBukrsModel) {
                const aBukrsItems = oVHBukrsModel.getProperty("/items") || [];
                const oSelectedBukrs = aBukrsItems.find(
                  (item) => item.Bukrs === sBukrs
                );
                if (oSelectedBukrs) {
                  oRequestModel.setProperty("/Butxt", oSelectedBukrs.Butxt);
                }
              }
            }
          }
        }
        if (this._oWerksDialog) this._oWerksDialog.close();
      },
      // завод
      onWerksCancelPress: function () {
        if (this._oWerksDialog) this._oWerksDialog.close();
      },

      onSearchUser: function () {
        if (!this._oUserDialog) {
          this._oUserDialog = sap.ui.xmlfragment(
            "com.segezha.form.mpr.view.fragments.VHUsers",
            this
          );
          this.getView().addDependent(this._oUserDialog);
        }

        const oUserModel =
          this.getModel("VHuser") ||
          this.getOwnerComponent().getModel("VHuser");
        this._oUserDialog.setModel(oUserModel);

        this._oUserDialog.getTableAsync().then(
          function (oTable) {
            if (oTable.getColumns) {
              const aColumns = oTable.getColumns() || [];
              for (let i = aColumns.length - 1; i >= 0; i--) {
                oTable.removeColumn(aColumns[i]);
                aColumns[i].destroy();
              }

              const oColBname = new UIColumn({
                label: new Label({ text: "Пользователь" }),
                template: new Text({ wrapping: false, text: "{Bname}" }),
              });
              oTable.addColumn(oColBname);

              const oColLastName = new UIColumn({
                label: new Label({ text: "Фамилия" }),
                template: new Text({ wrapping: false, text: "{McNamelas}" }),
              });
              oTable.addColumn(oColLastName);

              const oColFirstName = new UIColumn({
                label: new Label({ text: "Имя" }),
                template: new Text({ wrapping: false, text: "{McNamefir}" }),
              });
              oTable.addColumn(oColFirstName);

              const oColDepartment = new UIColumn({
                label: new Label({ text: "Отдел" }),
                template: new Text({ wrapping: false, text: "{Department}" }),
              });
              oTable.addColumn(oColDepartment);

              if (oTable.bindRows) {
                oTable.bindAggregation("rows", {
                  path: "/items", // или корень, если данные на уровне корня
                  events: {
                    dataReceived: function () {
                      this._oUserDialog.update();
                    }.bind(this),
                  },
                });
              }
            }

            // mobile table
            if (oTable.bindItems) {
              if (oTable.removeAllColumns) {
                oTable.removeAllColumns();
              }
              oTable.addColumn(
                new sap.m.Column({
                  header: new Label({ text: "Пользователь" }),
                })
              );
              oTable.addColumn(
                new sap.m.Column({ header: new Label({ text: "Фамилия" }) })
              );
              oTable.addColumn(
                new sap.m.Column({ header: new Label({ text: "Имя" }) })
              );
              oTable.addColumn(
                new sap.m.Column({ header: new Label({ text: "Отдел" }) })
              );

              oTable.bindAggregation("items", {
                path: "/items",
                template: new sap.m.ColumnListItem({
                  cells: [
                    new Text({ text: "{Bname}" }),
                    new Text({ text: "{McNamelas}" }),
                    new Text({ text: "{McNamefir}" }),
                    new Text({ text: "{Department}" }),
                  ],
                }),
                events: {
                  dataReceived: function () {
                    this._oUserDialog.update();
                  }.bind(this),
                },
              });
            }
          }.bind(this)
        );
        this._oUserDialog.open();
      },

      onFilterBarSearchUser: function (oEvent) {
        const sSearchQuery = oEvent.getSource().getBasicSearchValue();
        const aSelectionSet = oEvent.getParameter("selectionSet");
        const aFilters = [];

        if (aSelectionSet) {
          aSelectionSet.forEach(function (oControl) {
            if (oControl.getValue && oControl.getValue()) {
              aFilters.push(
                new Filter({
                  path: oControl.getName(),
                  operator: FilterOperator.Contains,
                  value1: oControl.getValue(),
                })
              );
            }
          });
        }

        if (sSearchQuery) {
          aFilters.push(
            new Filter({
              filters: [
                new Filter({
                  path: "Bname",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
                new Filter({
                  path: "McNamelas",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
                new Filter({
                  path: "McNamefir",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
                new Filter({
                  path: "Department",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
              ],
              and: false,
            })
          );
        }

        this._filterUserTable(new Filter({ filters: aFilters, and: true }));
      },

      _filterUserTable: function (oFilter) {
        if (!this._oUserDialog) return;

        this._oUserDialog.getTableAsync().then(
          function (oTable) {
            if (oTable.bindRows) {
              const oBinding = oTable.getBinding("rows");
              if (oBinding) oBinding.filter(oFilter);
            }
            if (oTable.bindItems) {
              const oBinding = oTable.getBinding("items");
              if (oBinding) oBinding.filter(oFilter);
            }
            this._oUserDialog.update();
          }.bind(this)
        );
      },

      onUserOkPress: function (oEvent) {
        const aTokens = oEvent.getParameter("tokens");
        let sBname = null;
        let sMcNamelas = null;
        let sMcNamefir = null;
        let sDepartment = null;

        // Попробуем получить данные через selectedContexts — это надежнее
        const aContexts = oEvent.getParameter("selectedContexts") || [];
        if (aContexts.length > 0) {
          const oCtx = aContexts[0];
          const oData = oCtx.getObject();

          sBname = oData.Bname;
          sMcNamelas = oData.McNamelas;
          sMcNamefir = oData.McNamefir;
          sDepartment = oData.Department;
        } else if (aTokens && aTokens.length > 0) {
          // Если по какой-то причине selectedContexts нет, но токен есть
          const oToken = aTokens[0];
          sBname = oToken.getKey(); // или oToken.getText() если нужно имя

          // Но description не поддерживается в Token, так что получаем данные из модели
          const oUserModel =
            this.getModel("VHuser") ||
            this.getOwnerComponent().getModel("VHuser");
          if (oUserModel) {
            const aItems = oUserModel.getProperty("/items") || [];
            const oUser = aItems.find((item) => item.Bname === sBname);
            if (oUser) {
              sMcNamelas = oUser.McNamelas;
              sMcNamefir = oUser.McNamefir;
              sDepartment = oUser.Department;
            }
          }
        }

        if (sBname) {
          const oRequestModel = this.getModel("Request_data");
          if (oRequestModel) {
            oRequestModel.setProperty("/Bname", sBname);
            oRequestModel.setProperty("/McNamelas", sMcNamelas);
            oRequestModel.setProperty("/McNamefir", sMcNamefir);
            oRequestModel.setProperty("/Department", sDepartment);
          }
        }

        if (this._oUserDialog) this._oUserDialog.close();
      },

      onUserCancelPress: function () {
        if (this._oUserDialog) this._oUserDialog.close();
      },

      onSearchLeader: function () {
        if (!this._oLeaderDialog) {
          this._oLeaderDialog = sap.ui.xmlfragment(
            "com.segezha.form.mpr.view.fragments.VHLeader",
            this
          );
          this.getView().addDependent(this._oLeaderDialog);
        }

        const oUserModel =
          this.getModel("VHuser") ||
          this.getOwnerComponent().getModel("VHuser");
        this._oLeaderDialog.setModel(oUserModel);

        this._oLeaderDialog.getTableAsync().then(
          function (oTable) {
            if (oTable.getColumns) {
              const aColumns = oTable.getColumns() || [];
              for (let i = aColumns.length - 1; i >= 0; i--) {
                oTable.removeColumn(aColumns[i]);
                aColumns[i].destroy();
              }

              const oColBname = new UIColumn({
                label: new Label({ text: "Пользователь" }),
                template: new Text({ wrapping: false, text: "{Bname}" }),
              });
              oTable.addColumn(oColBname);

              const oColLastName = new UIColumn({
                label: new Label({ text: "Фамилия" }),
                template: new Text({ wrapping: false, text: "{McNamelas}" }),
              });
              oTable.addColumn(oColLastName);

              const oColFirstName = new UIColumn({
                label: new Label({ text: "Имя" }),
                template: new Text({ wrapping: false, text: "{McNamefir}" }),
              });
              oTable.addColumn(oColFirstName);

              const oColDepartment = new UIColumn({
                label: new Label({ text: "Отдел" }),
                template: new Text({ wrapping: false, text: "{Department}" }),
              });
              oTable.addColumn(oColDepartment);

              if (oTable.bindRows) {
                oTable.bindAggregation("rows", {
                  path: "/items",
                  events: {
                    dataReceived: function () {
                      this._oLeaderDialog.update();
                    }.bind(this),
                  },
                });
              }
            }

            // mobile table
            if (oTable.bindItems) {
              if (oTable.removeAllColumns) {
                oTable.removeAllColumns();
              }
              oTable.addColumn(
                new sap.m.Column({
                  header: new Label({ text: "Пользователь" }),
                })
              );
              oTable.addColumn(
                new sap.m.Column({ header: new Label({ text: "Фамилия" }) })
              );
              oTable.addColumn(
                new sap.m.Column({ header: new Label({ text: "Имя" }) })
              );
              oTable.addColumn(
                new sap.m.Column({ header: new Label({ text: "Отдел" }) })
              );

              oTable.bindAggregation("items", {
                path: "/items",
                template: new sap.m.ColumnListItem({
                  cells: [
                    new Text({ text: "{Bname}" }),
                    new Text({ text: "{McNamelas}" }),
                    new Text({ text: "{McNamefir}" }),
                    new Text({ text: "{Department}" }),
                  ],
                }),
                events: {
                  dataReceived: function () {
                    this._oLeaderDialog.update();
                  }.bind(this),
                },
              });
            }
          }.bind(this)
        );
        this._oLeaderDialog.open();
      },

      onFilterBarSearchLeader: function (oEvent) {
        const sSearchQuery = oEvent.getSource().getBasicSearchValue();
        const aSelectionSet = oEvent.getParameter("selectionSet");
        const aFilters = [];

        if (aSelectionSet) {
          aSelectionSet.forEach(function (oControl) {
            if (oControl.getValue && oControl.getValue()) {
              aFilters.push(
                new Filter({
                  path: oControl.getName(),
                  operator: FilterOperator.Contains,
                  value1: oControl.getValue(),
                })
              );
            }
          });
        }

        if (sSearchQuery) {
          aFilters.push(
            new Filter({
              filters: [
                new Filter({
                  path: "Bname",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
                new Filter({
                  path: "McNamelas",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
                new Filter({
                  path: "McNamefir",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
                new Filter({
                  path: "Department",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
              ],
              and: false,
            })
          );
        }

        this._filterLeaderTable(new Filter({ filters: aFilters, and: true }));
      },

      _filterLeaderTable: function (oFilter) {
        if (!this._oLeaderDialog) return;

        this._oLeaderDialog.getTableAsync().then(
          function (oTable) {
            if (oTable.bindRows) {
              const oBinding = oTable.getBinding("rows");
              if (oBinding) oBinding.filter(oFilter);
            }
            if (oTable.bindItems) {
              const oBinding = oTable.getBinding("items");
              if (oBinding) oBinding.filter(oFilter);
            }
            this._oLeaderDialog.update();
          }.bind(this)
        );
      },

      onLeaderOkPress: function (oEvent) {
        const aTokens = oEvent.getParameter("tokens");
        let sBname = null;
        let sMcNamelas = null;
        let sMcNamefir = null;
        let sDepartment = null;

        if (aTokens && aTokens.length > 0) {
          // Получаем ключ (Bname) из токена
          sBname = aTokens[0].getKey();

          // Получаем остальные данные из модели по ключу
          const oUserModel =
            this.getModel("VHuser") ||
            this.getOwnerComponent().getModel("VHuser");
          if (oUserModel) {
            const aItems = oUserModel.getProperty("/items") || [];
            const oUser = aItems.find((item) => item.Bname === sBname);
            if (oUser) {
              sMcNamelas = oUser.McNamelas;
              sMcNamefir = oUser.McNamefir;
              sDepartment = oUser.Department;
            }
          }
        } else {
          // Если токены не пришли, пробуем через selectedContexts
          const aContexts = oEvent.getParameter("selectedContexts") || [];
          if (aContexts.length > 0) {
            const oCtx = aContexts[0];
            const oData = oCtx.getObject();

            sBname = oData.Bname;
            sMcNamelas = oData.McNamelas;
            sMcNamefir = oData.McNamefir;
            sDepartment = oData.Department;
          }
        }

        if (sBname) {
          const oRequestModel = this.getModel("Request_data");
          if (oRequestModel) {
            // Записываем в поля Leader и LeaderName
            oRequestModel.setProperty("/Leader", sBname);
            oRequestModel.setProperty(
              "/LeaderName",
              sMcNamelas + " " + sMcNamefir
            );
          }
        }

        if (this._oLeaderDialog) this._oLeaderDialog.close();
      },

      onLeaderCancelPress: function () {
        if (this._oLeaderDialog) this._oLeaderDialog.close();
      },

      onSearchUserCopy: function () {
        if (!this._oUserCopyDialog) {
          this._oUserCopyDialog = sap.ui.xmlfragment(
            "com.segezha.form.mpr.view.fragments.VHUserCopy",
            this
          );
          this.getView().addDependent(this._oUserCopyDialog);
        }

        const oUserModel =
          this.getModel("VHuser") ||
          this.getOwnerComponent().getModel("VHuser");
        this._oUserCopyDialog.setModel(oUserModel);

        this._oUserCopyDialog.getTableAsync().then(
          function (oTable) {
            if (oTable.getColumns) {
              const aColumns = oTable.getColumns() || [];
              for (let i = aColumns.length - 1; i >= 0; i--) {
                oTable.removeColumn(aColumns[i]);
                aColumns[i].destroy();
              }

              const oColBname = new UIColumn({
                label: new Label({ text: "Пользователь" }),
                template: new Text({ wrapping: false, text: "{Bname}" }),
              });
              oTable.addColumn(oColBname);

              const oColLastName = new UIColumn({
                label: new Label({ text: "Фамилия" }),
                template: new Text({ wrapping: false, text: "{McNamelas}" }),
              });
              oTable.addColumn(oColLastName);

              const oColFirstName = new UIColumn({
                label: new Label({ text: "Имя" }),
                template: new Text({ wrapping: false, text: "{McNamefir}" }),
              });
              oTable.addColumn(oColFirstName);

              const oColDepartment = new UIColumn({
                label: new Label({ text: "Отдел" }),
                template: new Text({ wrapping: false, text: "{Department}" }),
              });
              oTable.addColumn(oColDepartment);

              if (oTable.bindRows) {
                oTable.bindAggregation("rows", {
                  path: "/items",
                  events: {
                    dataReceived: function () {
                      this._oUserCopyDialog.update();
                    }.bind(this),
                  },
                });
              }
            }

            // mobile table
            if (oTable.bindItems) {
              if (oTable.removeAllColumns) {
                oTable.removeAllColumns();
              }
              oTable.addColumn(
                new sap.m.Column({
                  header: new Label({ text: "Пользователь" }),
                })
              );
              oTable.addColumn(
                new sap.m.Column({ header: new Label({ text: "Фамилия" }) })
              );
              oTable.addColumn(
                new sap.m.Column({ header: new Label({ text: "Имя" }) })
              );
              oTable.addColumn(
                new sap.m.Column({ header: new Label({ text: "Отдел" }) })
              );

              oTable.bindAggregation("items", {
                path: "/items",
                template: new sap.m.ColumnListItem({
                  cells: [
                    new Text({ text: "{Bname}" }),
                    new Text({ text: "{McNamelas}" }),
                    new Text({ text: "{McNamefir}" }),
                    new Text({ text: "{Department}" }),
                  ],
                }),
                events: {
                  dataReceived: function () {
                    this._oUserCopyDialog.update();
                  }.bind(this),
                },
              });
            }
          }.bind(this)
        );
        this._oUserCopyDialog.open();
      },

      onFilterBarSearchUserCopy: function (oEvent) {
        const sSearchQuery = oEvent.getSource().getBasicSearchValue();
        const aSelectionSet = oEvent.getParameter("selectionSet");
        const aFilters = [];

        if (aSelectionSet) {
          aSelectionSet.forEach(function (oControl) {
            if (oControl.getValue && oControl.getValue()) {
              aFilters.push(
                new Filter({
                  path: oControl.getName(),
                  operator: FilterOperator.Contains,
                  value1: oControl.getValue(),
                })
              );
            }
          });
        }

        if (sSearchQuery) {
          aFilters.push(
            new Filter({
              filters: [
                new Filter({
                  path: "Bname",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
                new Filter({
                  path: "McNamelas",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
                new Filter({
                  path: "McNamefir",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
                new Filter({
                  path: "Department",
                  operator: FilterOperator.Contains,
                  value1: sSearchQuery,
                }),
              ],
              and: false,
            })
          );
        }

        this._filterUserCopyTable(new Filter({ filters: aFilters, and: true }));
      },

      _filterUserCopyTable: function (oFilter) {
        if (!this._oUserCopyDialog) return;

        this._oUserCopyDialog.getTableAsync().then(
          function (oTable) {
            if (oTable.bindRows) {
              const oBinding = oTable.getBinding("rows");
              if (oBinding) oBinding.filter(oFilter);
            }
            if (oTable.bindItems) {
              const oBinding = oTable.getBinding("items");
              if (oBinding) oBinding.filter(oFilter);
            }
            this._oUserCopyDialog.update();
          }.bind(this)
        );
      },

      onUserCopyOkPress: function (oEvent) {
        const aTokens = oEvent.getParameter("tokens");
        let sBname = null;
        let sMcNamelas = null;
        let sMcNamefir = null;
        let sDepartment = null;

        if (aTokens && aTokens.length > 0) {
          sBname = aTokens[0].getKey();

          // Получаем остальные данные из модели по ключу
          const oUserModel =
            this.getModel("VHuser") ||
            this.getOwnerComponent().getModel("VHuser");
          if (oUserModel) {
            const aItems = oUserModel.getProperty("/items") || [];
            const oUser = aItems.find((item) => item.Bname === sBname);
            if (oUser) {
              sMcNamelas = oUser.McNamelas;
              sMcNamefir = oUser.McNamefir;
              sDepartment = oUser.Department;
            }
          }
        } else {
          const aContexts = oEvent.getParameter("selectedContexts") || [];
          if (aContexts.length > 0) {
            const oCtx = aContexts[0];
            const oData = oCtx.getObject();

            sBname = oData.Bname;
            sMcNamelas = oData.McNamelas;
            sMcNamefir = oData.McNamefir;
            sDepartment = oData.Department;
          }
        }
        debugger;

        if (sBname) {
          const oRequestModel = this.getModel("Request_data");
          if (oRequestModel) {
            // Записываем в поля UserCopy и UserCopyName
            oRequestModel.setProperty("/UserCopy", sBname);
            oRequestModel.setProperty(
              "/UserCopyName",
              sMcNamelas + " " + sMcNamefir
            );
          }
        }

        if (this._oUserCopyDialog) this._oUserCopyDialog.close();
      },

      onUserCopyCancelPress: function () {
        if (this._oUserCopyDialog) this._oUserCopyDialog.close();
      },
      // TODO остальные методы

      onUserTypeChange: function (oEvent) {
        var iSelectedIndex = oEvent.getParameter("selectedIndex");
        var oDataModel = this.getModel("Request_data");
        if (oDataModel) {
          var bNewUser = iSelectedIndex === 1;
          oDataModel.setProperty("/NewUser", bNewUser);
          // стираем поля
          oDataModel.setProperty("/McNamelas", "");
          oDataModel.setProperty("/McNamefir", "");
          oDataModel.setProperty("/Namemiddle", "");
          oDataModel.setProperty("/McNamemid", "");
          oDataModel.setProperty("/Department", "");
          oDataModel.setProperty("/Function", "");
          oDataModel.setProperty("/SmtpAddr", "");
        }
      },
      // отправка данных на сервер
      onSendRequest: function () {
        const oRequestDataModel = this.getModel("Request_data");
        if (!oRequestDataModel) {
          MessageBox.error("нет модели");
          return;
        }
        const requestData = oRequestDataModel.getData();
        // какая нибудь валидация
        if (!requestData.NameLast || !requestData.NameFirst) {
          MessageBox.warning("заполните поля");
          return;
        }

        // вызов асинхронного метода
        this.sendRequestToServer(requestData);
      },
      async sendRequestToServer(requestData) {
        try {
          const oModel = this.getOwnerComponent().getModel();

          console.log("данные ", JSON.stringify(requestData, null, 2));
          console.log("URL ", oModel.sServiceUrl);

          // минимальный набор данных для тестирования
          const minimalData = {
            NameLast: requestData.NameLast || "Test",
            NameFirst: requestData.NameFirst || "Test",
            Namemiddle: requestData.Namemiddle || "Test",
            Department: requestData.Department || "Test",
            Function: requestData.Function || "Test",
            SmtpAddr: requestData.SmtpAddr || "test@test.com",
            Leader: requestData.Leader || "test",
            UserCopy: requestData.UserCopy || "test",
            Bukrs: requestData.Bukrs || "1000",
            Werks: requestData.Werks || "1000",
            Statu: requestData.Statu || "Test",
            LoginName: requestData.LoginName || "test",
            LeaderName: requestData.LeaderName || "test",
            UserCopyName: requestData.UserCopyName || "test",
            Butxt: requestData.Butxt || "Test",
            Name1: requestData.Name1 || "test",
            CuserName: requestData.CuserName || "test",
            UuserName: "",
            LuserName: "",
            VuserName: "",
            Active: requestData.Active || true,
            LeaderExt: requestData.LeaderExt || false,
            CommentExt: requestData.CommentExt || "test",
            NewUser: requestData.NewUser || true,
          };

          console.log(
            "добавление данных для отправки:",
            JSON.stringify(minimalData, null, 2)
          );

          const response = await new Promise((resolve, reject) => {
            oModel.create("/Request_dataCollection", minimalData, {
              success: function (oData, response) {
                console.log("данные отправлены:", oData);
                console.log("response:", response);
                resolve(oData);
              },
              error: function (oError) {
                console.error("ошибка в create - sendRequestToServer", oError);
                console.error("URL ", oError.url);
                console.error("метод ", oError.method);
                console.error("полный ответ ", oError.responseText);
                reject(oError);
              },
            });
          });

          MessageBox.success("данные отправлены");
        } catch (error) {
          console.error("ошибка в catch - sendRequestToServer ", error);
          if (
            error.statusCode === 500 ||
            error.message.includes("Runtime error")
          ) {
            console.error("возможно нет доступа к беку");
          } else {
            MessageBox.error(
              "ошибка: " + (error.message || "неизвестная ошибка")
            );
          }
        }
      },
      // TODO User методы
      // onSearchUser: function () {
      //   open VHUsers fragment and bind VHuser model
      //   if (!this._oUsersDialog) {
      //     this._oUsersDialog = sap.ui.xmlfragment(
      //       "com.segezha.form.mpr.view.fragments.VHUsers",
      //       this
      //     );
      //     this.getView().addDependent(this._oUsersDialog);
      //   }
      //   const oUserModel =
      //     this.getModel("VHuser") ||
      //     this.getOwnerComponent().getModel("VHuser");
      //   this._oUsersDialog.setModel(oUserModel);
      //   this._oUsersDialog.getTableAsync().then(
      //     function (oTable) {
      //       if (oTable.getColumns) {
      //         const aColumns = oTable.getColumns() || [];
      //         for (let i = aColumns.length - 1; i >= 0; i--) {
      //           oTable.removeColumn(aColumns[i]);
      //           aColumns[i].destroy();
      //         }
      //         oTable.addColumn(
      //           new UIColumn({
      //             label: new Label({ text: "Логин" }),
      //             template: new Text({ text: "{Bname}" }),
      //           })
      //         );
      //         oTable.addColumn(
      //           new UIColumn({
      //             label: new Label({ text: "Фамилия" }),
      //             template: new Text({ text: "{McNamelas}" }),
      //           })
      //         );
      //         oTable.addColumn(
      //           new UIColumn({
      //             label: new Label({ text: "Имя" }),
      //             template: new Text({ text: "{McNamefir}" }),
      //           })
      //         );
      //         if (oTable.bindRows) {
      //           oTable.bindAggregation("rows", { path: "/items" });
      //         }
      //       }
      //       if (oTable.bindItems) {
      //         if (oTable.removeAllColumns) oTable.removeAllColumns();
      //         oTable.addColumn(
      //           new sap.m.Column({ header: new Label({ text: "Логин" }) })
      //         );
      //         oTable.addColumn(
      //           new sap.m.Column({ header: new Label({ text: "Фамилия" }) })
      //         );
      //         oTable.addColumn(
      //           new sap.m.Column({ header: new Label({ text: "Имя" }) })
      //         );
      //         oTable.bindAggregation("items", {
      //           path: "/items",
      //           template: new sap.m.ColumnListItem({
      //             cells: [
      //               new Text({ text: "{Bname}" }),
      //               new Text({ text: "{McNamelas}" }),
      //               new Text({ text: "{McNamefir}" }),
      //             ],
      //           }),
      //         });
      //       }
      //     }.bind(this)
      //   );
      //   this._oUsersDialog.open();
      // },
      // onFilterBarSearchUsers: function (oEvent) {
      //   const sSearchQuery = oEvent.getSource().getBasicSearchValue();
      //   const aSelectionSet = oEvent.getParameter("selectionSet") || [];
      //   const aFilters = [];
      //   aSelectionSet.forEach(function (oControl) {
      //     if (oControl.getValue && oControl.getValue()) {
      //       aFilters.push(
      //         new Filter({
      //           path: oControl.getName(),
      //           operator: FilterOperator.Contains,
      //           value1: oControl.getValue(),
      //         })
      //       );
      //     }
      //   });
      //   if (sSearchQuery) {
      //     aFilters.push(
      //       new Filter({
      //         filters: [
      //           new Filter({
      //             path: "Bname",
      //             operator: FilterOperator.Contains,
      //             value1: sSearchQuery,
      //           }),
      //           new Filter({
      //             path: "McNamelas",
      //             operator: FilterOperator.Contains,
      //             value1: sSearchQuery,
      //           }),
      //           new Filter({
      //             path: "McNamefir",
      //             operator: FilterOperator.Contains,
      //             value1: sSearchQuery,
      //           }),
      //         ],
      //         and: false,
      //       })
      //     );
      //   }
      //   this._filterUsersTable(new Filter({ filters: aFilters, and: true }));
      // },
      // _filterUsersTable: function (oFilter) {
      //   if (!this._oUsersDialog) return;
      //   this._oUsersDialog.getTableAsync().then(
      //     function (oTable) {
      //       if (oTable.bindRows) {
      //         const oBinding = oTable.getBinding("rows");
      //         if (oBinding) oBinding.filter(oFilter);
      //       }
      //       if (oTable.bindItems) {
      //         const oBinding = oTable.getBinding("items");
      //         if (oBinding) oBinding.filter(oFilter);
      //       }
      //       this._oUsersDialog.update();
      //     }.bind(this)
      //   );
      // },
      // onUserOkPress: function (oEvent) {
      //   const aTokens = oEvent.getParameter("tokens");
      //   let sKey = null;
      //   let sText = null;
      //   if (aTokens && aTokens.length > 0) {
      //     sKey = aTokens[0].getKey();
      //     sText = aTokens[0].getText();
      //   } else {
      //     const aCtx = oEvent.getParameter("selectedContexts") || [];
      //     if (aCtx.length > 0) {
      //       const oData = aCtx[0].getObject();
      //       sKey = oData.Bname;
      //       sText =
      //         oData.McNamelas + (oData.McNamefir ? " " + oData.McNamefir : "");
      //     }
      //   }
      //   if (sKey) {
      //     const oRequest = this.getModel("Request_data");
      //     if (oRequest) {
      //       oRequest.setProperty("/Name1", sKey);
      //       oRequest.setProperty("/NameLast", sText);
      //     }
      //   }
      //   if (this._oUsersDialog) this._oUsersDialog.close();
      // },
      // onUserCancelPress: function () {
      //   if (this._oUsersDialog) this._oUsersDialog.close();
      // }
      // TODO User методы ^^^^^
    });
  }
);
