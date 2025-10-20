sap.ui.define(
  [
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/ui/table/Column",
    "sap/m/Column",
    "sap/m/Text",
    "sap/m/Label",
    "sap/m/ColumnListItem",
  ],
  function (
    Fragment,
    JSONModel,
    Filter,
    FilterOperator,
    MessageBox,
    UIColumn,
    MColumn,
    Text,
    Label,
    ColumnListItem
  ) {
    "use strict";

    const ValueHelpHandler = {
      // Убрали _dialogs

      /**
       * Открывает общий ValueHelp диалог, работающий с JSONModel.
       * Диалог будет уничтожен (destroy) после закрытия.
       * @param {object} config - Конфигурация для ValueHelp
       * @param {string} config.id - Уникальный ID для идентификации диалога (например, "bukrs", "werks") - пока не используется для хранения, но может быть полезен.
       * @param {string} config.modelName - Имя JSON-модели (например, "VHbukrs")
       * @param {string} config.title - Заголовок диалога
       * @param {string} config.keyPath - Имя свойства, которое будет ключом (для токенов и OK)
       * @param {string} config.descriptionPath - Имя свойства, которое будет описанием (в токенах не используется, но важно для UX)
       * @param {Array} config.displayFields - Массив объектов {name, label} для отображения в таблице
       * @param {Array} [config.filterFields] - Массив имен полей (strings) для фильтрации. Если не указан, используется displayFields.
       * @param {object} [config.dependencyFilters] - Объект {path: value} для фильтрации на основе данных из другой модели (например, Request_data). Применяется при открытии и как фильтр по умолчанию при поиске.
       * @param {function} config.onSelectCallback - Функция, вызываемая при выборе значения. Принимает выбранный объект данных.
       * @param {sap.ui.core.mvc.Controller} controller - Контроллер, из которого вызывается
       */
      openValueHelp: async function (config, controller) {
        // const sId = config.id; // Больше не используется для хранения
        let oDialog = null; // Не ищем в _dialogs

        try {
          // Получаем JSON модель
          const oJsonModel =
            controller.getModel(config.modelName) ||
            controller.getOwnerComponent().getModel(config.modelName);
          if (!oJsonModel) {
            throw new Error(`JSON Model '${config.modelName}' not found.`);
          }

          // Получаем все данные из модели
          let aFullItems = oJsonModel.getProperty("/items") || [];

          // Применяем зависимости, если есть (это начальный фильтр)
          let aFilteredItems = aFullItems;
          if (config.dependencyFilters) {
            Object.entries(config.dependencyFilters).forEach(
              ([sPath, sValue]) => {
                if (sValue !== undefined && sValue !== null && sValue !== "") {
                  aFilteredItems = aFilteredItems.filter(
                    (item) => item[sPath] === sValue
                  );
                }
              }
            );
          }

          // Создаем НОВЫЙ фрагмент
          oDialog = await Fragment.load({
            id: controller.getView().getId(),
            name: "com.segezha.form.mpr.view.fragments.ValueHelpDialog",
            controller: {
              onGenericOkPress: (oEvent) =>
                this._onOkPress(oEvent, config, controller), // oEvent - sap.ui.base.Event
              onGenericCancelPress: (oEvent) =>
                this._onCancelPress(oEvent, config), // oEvent - sap.ui.base.Event
              onGenericSearch: (oEvent) =>
                this._onSearch(oEvent, config, aFullItems), // oEvent - sap.ui.base.Event, aFullItems - данные
            },
          });
          controller.getView().addDependent(oDialog);

          // Устанавливаем временную JSON модель для диалога с начальными (отфильтрованными) данными
          const oVHModel = new JSONModel({ items: aFilteredItems });
          oDialog.setModel(oVHModel);

          // Настраиваем фильтры (используем filterFields, если заданы, иначе displayFields)
          const aFilterFieldNames =
            config.filterFields || config.displayFields.map((f) => f.name);
          this._setupFilters(oDialog, aFilterFieldNames);

          // Настраиваем таблицу
          this._setupTable(oDialog, config.displayFields);

          // Привязываем данные к таблице
          oDialog.getTableAsync().then(function (oTable) {
            if (oTable.bindRows) {
              oTable.bindAggregation("rows", "/items");
            } else if (oTable.bindItems) {
              oTable.bindAggregation("items", {
                path: "/items",
                template: new ColumnListItem({
                  cells: config.displayFields.map(
                    (field) => new Text({ text: `{${field.name}}` })
                  ),
                }),
              });
            }
          });

          // Обновляем свойства диалога (включая key и descriptionKey)
          oDialog.setTitle(config.title);
          // Установка key и descriptionKey программно
          oDialog.setProperty("key", config.keyPath);
          oDialog.setProperty("descriptionKey", config.descriptionPath);

          oDialog.open();
          // Диалог теперь готов и открыт, ссылка хранится только в этой функции и передается в обработчики
        } catch (error) {
          console.error("Error opening ValueHelp dialog:", error);
          MessageBox.error(
            "Ошибка при открытии справочника: " +
              (error.message || "Неизвестная ошибка")
          );
          // Если диалог был создан, но произошла ошибка позже, убедимся, что он уничтожен
          if (oDialog) {
            oDialog.destroy(); // Уничтожаем в случае ошибки
          }
        }
      },

      _setupFilters: function (oDialog, aFilterFieldNames) {
        const oFilterBar = oDialog.getFilterBar();
        if (!oFilterBar) {
          console.error("FilterBar not found in dialog.");
          return;
        }

        // Очищаем существующие фильтры
        oFilterBar.removeAllFilterGroupItems();

        aFilterFieldNames.forEach((sFieldName) => {
          const oFilterItem = new sap.ui.comp.filterbar.FilterGroupItem({
            groupName: "GENERIC",
            name: sFieldName,
            label: sFieldName, // Можно улучшить, передавая лейблы в конфиге
            visibleInFilterBar: true,
          });
          oFilterItem.setControl(new sap.m.Input({ name: sFieldName }));
          oFilterBar.addFilterGroupItem(oFilterItem);
        });
      },

      _setupTable: function (oDialog, aDisplayFields) {
        oDialog.getTableAsync().then(
          function (oTable) {
            // Очищаем существующие столбцы
            if (oTable.getColumns) {
              // sap.ui.table.Table
              const aColumns = oTable.getColumns();
              aColumns.forEach((col) => col.destroy());
              aDisplayFields.forEach((field) => {
                const oCol = new UIColumn({
                  label: new Label({ text: field.label || field.name }),
                  template: new Text({
                    wrapping: false,
                    text: `{${field.name}}`,
                  }),
                });
                oTable.addColumn(oCol);
              });
            } else if (oTable.bindItems) {
              // sap.m.Table
              if (oTable.removeAllColumns) {
                oTable.removeAllColumns();
              }
              aDisplayFields.forEach((field) => {
                oTable.addColumn(
                  new MColumn({
                    header: new Label({ text: field.label || field.name }),
                  })
                );
              });
              // Обновляем привязку items, чтобы использовать новые столбцы
              const oBindingInfo = oTable.getBindingInfo("items");
              if (oBindingInfo) {
                oTable.bindAggregation("items", {
                  ...oBindingInfo,
                  template: new ColumnListItem({
                    cells: aDisplayFields.map(
                      (field) => new Text({ text: `{${field.name}}` })
                    ),
                  }),
                });
              }
            }
          }.bind(this)
        );
      },

      _onSearch: function (oEvent, config, aFullItems) {
        // oEvent - sap.ui.base.Event, aFullItems - полный список данных до фильтрации
        const oFilterBar = oEvent.getSource(); // getSource() возвращает FilterBar
        const sSearchQuery = oFilterBar.getBasicSearchValue();
        const aSelectionSet = oEvent.getParameter("selectionSet");

        // Начинаем с полного списка
        let aFilteredItems = [...aFullItems];

        // Применяем зависимые фильтры (если они были при открытии)
        if (config.dependencyFilters) {
          Object.entries(config.dependencyFilters).forEach(
            ([sPath, sValue]) => {
              if (sValue !== undefined && sValue !== null && sValue !== "") {
                aFilteredItems = aFilteredItems.filter(
                  (item) => item[sPath] === sValue
                );
              }
            }
          );
        }

        // Применяем фильтры из полей ввода
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

        // Применяем общий поиск
        if (sSearchQuery) {
          aFilteredItems = aFilteredItems.filter((item) => {
            return (
              config.filterFields || config.displayFields.map((f) => f.name)
            ).some((sField) => {
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

        // Обновляем модель диалога с отфильтрованными данными
        const oVHModel = oFilterBar.getParent().getModel(); // getParent() -> ValueHelpDialog, getModel() -> oVHModel
        oVHModel.setData({ items: aFilteredItems });
        oVHModel.refresh();
      },

      _onOkPress: function (oEvent, config, controller) {
        // oEvent - sap.ui.base.Event
        const aTokens = oEvent.getParameter("tokens");
        const aContexts = oEvent.getParameter("selectedContexts") || [];
        let oSelectedData = null;

        if (aContexts.length > 0) {
          oSelectedData = aContexts[0].getObject();
        } else if (aTokens && aTokens.length > 0) {
          // Для JSONModel токены не привязаны напрямую к данным, нужно искать в модели диалога по ключу
          const sKey = aTokens[0].getKey();
          const oVHModel = oEvent.getSource().getModel(); // getSource() -> ValueHelpDialog, getModel() -> oVHModel
          const aItems = oVHModel.getProperty("/items") || [];
          oSelectedData = aItems.find((item) => item[config.keyPath] === sKey);
        }

        if (oSelectedData && config.onSelectCallback) {
          config.onSelectCallback(oSelectedData);
        }

        // Правильно получаем диалог из события и уничтожаем его
        const oDialog = oEvent.getSource(); // getSource() возвращает ValueHelpDialog
        this._destroyDialog(oDialog);
      },

      _onCancelPress: function (oEvent, config) {
        // oEvent - sap.ui.base.Event
        // Правильно получаем диалог из события и уничтожаем его
        const oDialog = oEvent.getSource(); // getSource() возвращает ValueHelpDialog
        this._destroyDialog(oDialog);
      },

      _destroyDialog: function (oDialog) {
        // oDialog - sap.ui.comp.valuehelpdialog.ValueHelpDialog
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

    return ValueHelpHandler;
  }
);
