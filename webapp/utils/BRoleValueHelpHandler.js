sap.ui.define(
  [
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/Column",
    "sap/m/Text",
    "sap/m/Label",
    "sap/m/ColumnListItem",
    "sap/m/Dialog",
    "sap/m/IconTabBar",
  ],
  function (
    Fragment,
    JSONModel,
    MessageBox,
    MColumn,
    Text,
    Label,
    ColumnListItem,
    Dialog,
    IconTabBar
  ) {
    "use strict";

    const BRoleValueHelpHandler = {
      openValueHelp: async function (controller, iSelectedIndex) {
        let oDialog = null;

        try {
          oDialog = await Fragment.load({
            id: controller.getView().getId(), // ID представления, к которому присоединяется фрагмент
            name: "com.segezha.form.mpr.view.fragments.BRoleSearchDialog",
            controller: {
              onBRoleOkPress: (oEvent) =>
                this._onOkPress(oEvent, controller, iSelectedIndex),
              onBRoleCancelPress: (oEvent) =>
                this._onCancelPress(oEvent, oDialog), // Передаем oDialog в onCancel
              onBRoleSearchVHRoleName: (oEvent) =>
                this._onSearchVHRoleName(oEvent, controller, oDialog), // Передаем oDialog
              onBRoleSearchVHRoleTransaction: (oEvent) =>
                this._onSearchVHRoleTransaction(oEvent, controller, oDialog), // Передаем oDialog
              onBRoleSearchVHRoleDescr: (oEvent) =>
                this._onSearchVHRoleDescr(oEvent, controller, oDialog), // Передаем oDialog
            },
          });
          controller.getView().addDependent(oDialog); // Добавляем диалог как зависимый элемент к View

          oDialog.setTitle("Поиск бизнес-ролей");

          // Передаем View (а не Dialog) в _setupTabsAndTables
          await this._setupTabsAndTables(
            oDialog,
            controller.getView(),
            controller
          );

          oDialog.open();
        } catch (error) {
          console.error("Error opening BRole Search dialog:", error);
          MessageBox.error(
            "Ошибка при открытии справочника бизнес-ролей: " +
              (error.message || "Неизвестная ошибка")
          );
          if (oDialog) {
            oDialog.destroy();
          }
        }
      },

      _setupTabsAndTables: async function (oDialog, oView, controller) {
        // Принимаем oView
        const aTabConfigs = [
          {
            modelName: "VHRoleName",
            filterBarId: "filterBarVHRoleName",
            tableId: "tableVHRoleName",
            displayFields: [
              { name: "GroupR", label: "Группа" },
              { name: "BRole", label: "Код роли" },
              { name: "BRoleName", label: "Наименование" },
              { name: "OrgNum", label: "Организация" },
            ],
            filterFields: ["GroupR", "BRole", "BRoleName", "OrgNum"],
          },
          {
            modelName: "VHRoleTransaction",
            filterBarId: "filterBarVHRoleTransaction",
            tableId: "tableVHRoleTransaction",
            displayFields: [
              { name: "Tcode", label: "Транзакция" },
              { name: "TileName", label: "Название плитки" },
              { name: "GroupR", label: "Группа" },
              { name: "BRole", label: "Код роли" },
              { name: "BRoleName", label: "Наименование" },
              { name: "OrgNum", label: "Организация" },
            ],
            filterFields: [
              "Tcode",
              "TileName",
              "GroupR",
              "BRole",
              "BRoleName",
              "OrgNum",
            ],
          },
          {
            modelName: "VHRoleDescr",
            filterBarId: "filterBarVHRoleDescr",
            tableId: "tableVHRoleDescr",
            displayFields: [
              { name: "Description", label: "Описание" },
              { name: "GroupR", label: "Группа" },
              { name: "BRole", label: "Код роли" },
              { name: "BRoleName", label: "Наименование" },
              { name: "OrgNum", label: "Организация" },
            ],
            filterFields: [
              "Description",
              "GroupR",
              "BRole",
              "BRoleName",
              "OrgNum",
            ],
          },
        ];

        // oIconTabBar = oDialog.getContent()[0]; // Это может не сработать напрямую, если Dialog использует другую структуру контента
        // Лучше получить его через View, зная его ID в фрагменте
        // const oIconTabBar = oView.byId("bRoleIconTabBar"); // Это может не сработать, если элемент вложенный и ID уникален только внутри фрагмента

        for (const tabConfig of aTabConfigs) {
          const {
            modelName,
            filterBarId,
            tableId,
            displayFields,
            filterFields,
          } = tabConfig;

          const oJsonModel =
            controller.getModel(modelName) ||
            controller.getOwnerComponent().getModel(modelName);
          if (!oJsonModel) {
            console.warn(`JSON Model '${modelName}' not found. Skipping.`);
            continue;
          }

          const aFullItems = oJsonModel.getProperty("/items") || [];

          const oTableModel = new JSONModel({
            items: aFullItems,
            originalItems: aFullItems,
          });
          oDialog.setModel(oTableModel, tableId);

          // Правильный способ получить элемент из фрагмента - через oView.byId()
          // ID элемента в фрагменте становится "ID_View--ID_Fragment--ID_Элемента_в_фрагменте"
          // Но Fragment.load с id: controller.getView().getId() делает ID "ID_View--ID_Элемента_в_фрагменте"
          const oFilterBar = oView.byId(filterBarId); // Используем oView.byId()
          const oTable = oView.byId(tableId); // Используем oView.byId()

          if (!oFilterBar || !oTable) {
            console.error(
              `FilterBar '${filterBarId}' or Table '${tableId}' not found in View. Full IDs might be needed if conflict occurs, but usually View ID -- Fragment ID -- Element ID is used. Current View ID: ${oView.getId()}`
            );
            console.error(
              `Searched for: ${oView.createId(filterBarId)}, ${oView.createId(
                tableId
              )}`
            ); // Покажет, как UI5 интерпретирует ID
            continue;
          }

          oFilterBar.removeAllFilterGroupItems();
          filterFields.forEach((sFieldName) => {
            const oFilterItem = new sap.ui.comp.filterbar.FilterGroupItem({
              groupName: tableId,
              name: sFieldName,
              label: sFieldName,
              visibleInFilterBar: true,
            });
            oFilterItem.setControl(new sap.m.Input({ name: sFieldName }));
            oFilterBar.addFilterGroupItem(oFilterItem);
          });

          if (oTable.removeAllColumns) {
            oTable.removeAllColumns();
          }
          displayFields.forEach((field) => {
            oTable.addColumn(
              new MColumn({
                header: new Label({ text: field.label || field.name }),
              })
            );
          });

          oTable.bindAggregation("items", {
            path: `${tableId}>/items`,
            template: new ColumnListItem({
              cells: displayFields.map(
                (field) => new Text({ text: `{${tableId}>${field.name}}` })
              ),
            }),
          });
        }
      },

      // --- Функции поиска: теперь принимают oDialog ---
      // Также изменим путь к FilterBar и Table внутри _performSearch
      _onSearchVHRoleName: function (oEvent, controller, oDialog) {
        this._performSearch(oEvent, controller, oDialog, "tableVHRoleName", [
          "GroupR",
          "BRole",
          "BRoleName",
          "OrgNum",
        ]);
      },

      _onSearchVHRoleTransaction: function (oEvent, controller, oDialog) {
        this._performSearch(
          oEvent,
          controller,
          oDialog,
          "tableVHRoleTransaction",
          ["Tcode", "TileName", "GroupR", "BRole", "BRoleName", "OrgNum"]
        );
      },

      _onSearchVHRoleDescr: function (oEvent, controller, oDialog) {
        this._performSearch(oEvent, controller, oDialog, "tableVHRoleDescr", [
          "Description",
          "GroupR",
          "BRole",
          "BRoleName",
          "OrgNum",
        ]);
      },

      // Вспомогательная функция: получаем FilterBar и Table через oView (через oDialog.getParent().getParent() -> View не надежно)
      // Лучше передавать View или использовать byId через View, зная ID.
      // Но в контексте события search, мы можем получить FilterBar. Нам нужно получить Table, связанную с ЭТИМ FilterBar.
      // Мы можем использовать тот же подход с oView.byId(), зная ID таблицы, связанной с FilterBar.
      // Или, зная структуру фрагмента, мы можем пройти от FilterBar к его родителю VBox, и там найти Table.
      _performSearch: function (
        oEvent,
        controller,
        oDialog,
        sTableId,
        aFilterFields
      ) {
        // Принимаем oDialog
        const oFilterBar = oEvent.getSource();
        const sSearchQuery = oFilterBar.getBasicSearchValue();
        const aSelectionSet = oEvent.getParameter("selectionSet");

        // Получаем View через Dialog (это менее надежно, чем передача View, но работает, если Dialog добавлен к View)
        // Dialog -> (обычно) Page/Panel/... -> View
        // Лучше передать oView сюда, но для упрощения используем oDialog.getParent()
        // Однако, если Dialog добавлен как зависимый (addDependent), getParent() вернет null.
        // Поэтому, получение через oView.byId() в _setupTabsAndTables было правильным подходом для настройки.
        // Для _performSearch, когда событие приходит от конкретного FilterBar, мы можем попытаться пройти по DOM или использовать View.
        // Самый надежный способ - передать View в _performSearch, но это требует изменений в вызовах.
        // Попробуем получить View через Dialog, зная, что он был добавлен как зависимый, но его родитель - это View.
        // Нет, addDependent не делает Dialog дочерним элементом View.
        // Нужно передать View или использовать глобальный доступ к View через controller.getView().

        const oView = controller.getView(); // Получаем View из контроллера
        const oTable = oView.byId(sTableId); // Используем View для поиска таблицы

        if (!oTable) {
          console.error(
            `Table '${sTableId}' not found in View during search. View ID: ${oView.getId()}`
          );
          console.error(`Searched for: ${oView.createId(sTableId)}`);
          return;
        }

        // Получаем модель таблицы через Dialog, используя тот же sTableId как ключ
        const oTableModel = oDialog.getModel(sTableId);
        if (!oTableModel) {
          console.warn(
            `Model for table '${sTableId}' not found during search.`
          );
          return;
        }

        let aFilteredItems = [
          ...(oTableModel.getProperty("/originalItems") || []),
        ];

        if (aSelectionSet) {
          aSelectionSet.forEach(function (oControl) {
            if (oControl.getValue && oControl.getValue()) {
              const sFieldName = oControl.getName();
              aFilteredItems = aFilteredItems.filter((item) => {
                const sValue = item[sFieldName];
                return (
                  sValue &&
                  sValue
                    .toString()
                    .toLowerCase()
                    .includes(oControl.getValue().toLowerCase())
                );
              });
            }
          });
        }

        if (sSearchQuery) {
          aFilteredItems = aFilteredItems.filter((item) => {
            return aFilterFields.some((sField) => {
              const sValue = item[sField];
              return (
                sValue &&
                sValue
                  .toString()
                  .toLowerCase()
                  .includes(sSearchQuery.toLowerCase())
              );
            });
          });
        }

        oTableModel.setProperty("/items", aFilteredItems);
        oTableModel.refresh();
      },

      _onOkPress: function (oEvent, controller, iSelectedIndex) {
        const oDialog = oEvent.getSource().getParent(); // Кнопка -> Dialog
        // const oIconTabBar = oDialog.getContent()[0]; // Не используем для поиска элементов
        let oSelectedData = null;

        const oView = controller.getView(); // Получаем View
        const aTableIds = [
          "tableVHRoleName",
          "tableVHRoleTransaction",
          "tableVHRoleDescr",
        ];

        for (const sTableId of aTableIds) {
          const oTable = oView.byId(sTableId); // Используем View для поиска
          if (oTable) {
            const oSelectedItem = oTable.getSelectedItem();
            if (oSelectedItem) {
              // Используем sTableId как ключ для модели
              const oBindingContext = oSelectedItem.getBindingContext(sTableId);
              if (oBindingContext) {
                oSelectedData = oBindingContext.getObject();
                break;
              }
            }
          }
        }

        if (oSelectedData) {
          if (
            oSelectedData.BRole !== undefined &&
            oSelectedData.BRoleName !== undefined
          ) {
            const oRequestModel = controller.getModel("Request_data");
            if (oRequestModel) {
              const aGuidArray = oRequestModel.getProperty("/Guid") || [];
              if (aGuidArray[iSelectedIndex] !== undefined) {
                aGuidArray[iSelectedIndex].BRole = oSelectedData.BRole;
                aGuidArray[iSelectedIndex].BRoleName = oSelectedData.BRoleName;
                oRequestModel.setProperty("/Guid", aGuidArray);
                console.log(
                  "Записаны BRole и BRoleName в строку Guid индекса",
                  iSelectedIndex,
                  ":",
                  oSelectedData
                );
              } else {
                console.error(
                  "Индекс строки для обновления выходит за пределы массива Guid."
                );
                MessageBox.error("Ошибка обновления данных.");
              }
            }
          } else {
            console.warn(
              "Выбранные данные не содержат BRole или BRoleName:",
              oSelectedData
            );
            MessageBox.warning(
              "Выбранный элемент не содержит необходимые данные (BRole или BRoleName)."
            );
          }
        } else {
          console.warn("Ни одна строка не была выбрана ни на одной вкладке.");
        }

        this._destroyDialog(oDialog);
      },

      _onCancelPress: function (oEvent, oDialog) {
        // Принимаем oDialog
        // const oDialog = oEvent.getSource().getParent(); // Кнопка -> Dialog (теперь oDialog передан)
        this._destroyDialog(oDialog);
      },

      _destroyDialog: function (oDialog) {
        if (oDialog && typeof oDialog.destroy === "function") {
          oDialog.destroy();
        } else {
          console.warn(
            "Attempted to destroy an invalid dialog object:",
            oDialog
          );
        }
      },
    };

    return BRoleValueHelpHandler;
  }
);
