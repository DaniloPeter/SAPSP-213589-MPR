sap.ui.define(
  [
    "com/segezha/form/mpr/controller/Base",
    "sap/m/MessageBox",
    "sap/m/Label",
    "sap/ui/table/Column",
    "sap/m/Text",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "com/segezha/form/mpr/utils/ValueHelpHandler",
  ],
  (
    BaseController,
    MessageBox,
    Label,
    UIColumn,
    Text,
    Filter,
    FilterOperator,
    ValueHelpHandler
  ) => {
    "use strict";

    return BaseController.extend("com.segezha.form.mpr.controller.Home", {
      _bAutoFilterApplied: false,

      async onInit() {
        const oRequestModel = this.getModel("Request_data");
        if (oRequestModel) {
          const oData = oRequestModel.getData();

          if (
            oData.DataFrom === undefined ||
            oData.DataFrom === null ||
            oData.DataFrom === ""
          ) {
            const oToday = new Date();
            oToday.setHours(0, 0, 0, 0);
            oRequestModel.setProperty("/DataFrom", oToday);
          }

          if (
            oData.DataTo === undefined ||
            oData.DataTo === null ||
            oData.DataTo === ""
          ) {
            const oMaxDate = new Date(9999, 11, 31);
            oRequestModel.setProperty("/DataTo", oMaxDate);
          }
          oRequestModel.refresh();
        }
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

      onSearchBukrs: async function () {
        const config = {
          id: "bukrs",
          modelName: "VHbukrs", // Имя JSON-модели
          title: "Справочник подразделений (BU)",
          keyPath: "Bukrs",
          descriptionPath: "Butxt",
          displayFields: [
            { name: "Bukrs", label: "Код" },
            { name: "Butxt", label: "Наименование" },
            { name: "Archive", label: "Архив" },
            { name: "Ort01", label: "Город" },
          ],
          filterFields: ["Bukrs", "Butxt", "Ort01", "Archive"],
          onSelectCallback: (oSelectedData) => {
            const oRequestModel = this.getModel("Request_data");
            if (oRequestModel) {
              oRequestModel.setProperty("/Bukrs", oSelectedData.Bukrs);
              oRequestModel.setProperty("/Butxt", oSelectedData.Butxt);
              oRequestModel.setProperty("/Werks", "");
              oRequestModel.setProperty("/Name1", "");
              oRequestModel.setProperty("/Ort01", "");
              oRequestModel.setProperty("/Land1", "");
            }
          },
        };
        await ValueHelpHandler.openValueHelp(config, this);
      },

      onSearchWerks: async function () {
        const oRequestModel = this.getModel("Request_data");
        const sBukrsValue = oRequestModel
          ? oRequestModel.getProperty("/Bukrs")
          : "";
        const config = {
          id: "werks",
          modelName: "VHWerks",
          title: "Справочник заводов",
          keyPath: "Werks",
          descriptionPath: "Name1",
          displayFields: [
            { name: "Bukrs", label: "Организация (BU)" },
            { name: "Werks", label: "Код завода" },
            { name: "Name1", label: "Наименование" },
            { name: "Ort01", label: "Город" },
            { name: "Land1", label: "Страна" },
          ],
          filterFields: ["Bukrs", "Werks", "Name1", "Ort01", "Land1"],
          dependencyFilters: sBukrsValue ? { Bukrs: sBukrsValue } : {}, // Фильтр зависимости
          onSelectCallback: (oSelectedData) => {
            const oRequestModel = this.getModel("Request_data");
            if (oRequestModel) {
              oRequestModel.setProperty("/Werks", oSelectedData.Werks);
              oRequestModel.setProperty("/Name1", oSelectedData.Name1);
              oRequestModel.setProperty("/Ort01", oSelectedData.Ort01);
              oRequestModel.setProperty("/Land1", oSelectedData.Land1);
              // Обновляем BU, если изменилось
              if (
                oSelectedData.Bukrs &&
                oSelectedData.Bukrs !== oRequestModel.getProperty("/Bukrs")
              ) {
                oRequestModel.setProperty("/Bukrs", oSelectedData.Bukrs);
                // Ищем BU текст в JSON модели
                const oVHBukrsModel =
                  this.getModel("VHbukrs") ||
                  this.getOwnerComponent().getModel("VHbukrs");
                if (oVHBukrsModel) {
                  const aBukrsItems = oVHBukrsModel.getProperty("/items") || [];
                  const oBukrsData = aBukrsItems.find(
                    (item) => item.Bukrs === oSelectedData.Bukrs
                  );
                  if (oBukrsData) {
                    oRequestModel.setProperty("/Butxt", oBukrsData.Butxt);
                  }
                }
              }
            }
          },
        };
        await ValueHelpHandler.openValueHelp(config, this);
      },

      onSearchUser: async function () {
        const config = {
          id: "user",
          modelName: "VHuser", // Имя JSON-модели
          title: "Справочник пользователей",
          keyPath: "Bname",
          descriptionPath: "McNamelas", // или комбинация
          displayFields: [
            // Массив объектов {name, label}
            { name: "Bname", label: "Пользователь" },
            { name: "McNamelas", label: "Фамилия" },
            { name: "McNamefir", label: "Имя" },
            { name: "Department", label: "Отдел" },
          ],
          filterFields: ["Bname", "McNamelas", "McNamefir", "Department"],
          onSelectCallback: (oSelectedData) => {
            const oRequestModel = this.getModel("Request_data");
            if (oRequestModel) {
              oRequestModel.setProperty("/Bname", oSelectedData.Bname);
              oRequestModel.setProperty("/McNamelas", oSelectedData.McNamelas);
              oRequestModel.setProperty("/McNamefir", oSelectedData.McNamefir);
              oRequestModel.setProperty(
                "/Department",
                oSelectedData.Department
              );
            }
          },
        };
        await ValueHelpHandler.openValueHelp(config, this);
      },

      onSearchLeader: async function () {
        const config = {
          id: "leader",
          modelName: "VHuser", // Используем ту же JSON-модель
          title: "Справочник руководителей",
          keyPath: "Bname",
          descriptionPath: "McNamelas",
          displayFields: [
            // Массив объектов {name, label}
            { name: "Bname", label: "Пользователь" },
            { name: "McNamelas", label: "Фамилия" },
            { name: "McNamefir", label: "Имя" },
            { name: "Department", label: "Отдел" },
          ],
          filterFields: ["Bname", "McNamelas", "McNamefir", "Department"],
          onSelectCallback: (oSelectedData) => {
            const oRequestModel = this.getModel("Request_data");
            if (oRequestModel) {
              oRequestModel.setProperty("/Leader", oSelectedData.Bname);
              oRequestModel.setProperty(
                "/LeaderName",
                `${oSelectedData.McNamelas} ${oSelectedData.McNamefir}`.trim()
              );
            }
          },
        };
        await ValueHelpHandler.openValueHelp(config, this);
      },

      onSearchUserCopy: async function () {
        const config = {
          id: "userCopy",
          modelName: "VHuser", // Используем ту же JSON-модель
          title: "Справочник пользователей для копии",
          keyPath: "Bname",
          descriptionPath: "McNamelas",
          displayFields: [
            // Массив объектов {name, label}
            { name: "Bname", label: "Пользователь" },
            { name: "McNamelas", label: "Фамилия" },
            { name: "McNamefir", label: "Имя" },
            { name: "Department", label: "Отдел" },
          ],
          filterFields: ["Bname", "McNamelas", "McNamefir", "Department"],
          onSelectCallback: (oSelectedData) => {
            const oRequestModel = this.getModel("Request_data");
            if (oRequestModel) {
              oRequestModel.setProperty("/UserCopy", oSelectedData.Bname);
              oRequestModel.setProperty(
                "/UserCopyName",
                `${oSelectedData.McNamelas} ${oSelectedData.McNamefir}`.trim()
              );
            }
          },
        };
        await ValueHelpHandler.openValueHelp(config, this);
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
    });
  }
);
