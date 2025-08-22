sap.ui.define([], () => {
  "use strict";

  return {
    formatText(sValue, sPath) {
      if (!sValue) {
        return "";
      }
      return `(Данные из (${sPath}) - ${sValue})`;
    },

    formatDate(oDate) {
      if (!oDate) {
        return "";
      }

      let dateObj = oDate;

      // Если это уже объект Date, используем его напрямую
      if (oDate instanceof Date) {
        dateObj = oDate;
      }
      // Если это объект SAP с датой, извлекаем значение
      else if (typeof oDate === "object" && oDate !== null) {
        // Проверяем различные возможные структуры SAP дат
        if (oDate.value) {
          dateObj = oDate.value;
        } else if (oDate.__edmType === "Edm.DateTime" && oDate.value) {
          dateObj = oDate.value;
        } else if (oDate.$) {
          dateObj = oDate.$;
        } else if (typeof oDate === "string") {
          dateObj = oDate;
        } else {
          // Логируем структуру объекта для отладки
          console.log("Unknown date object structure:", oDate);
          return "";
        }
      }

      // Если это строка даты, преобразуем в объект Date
      if (typeof dateObj === "string") {
        dateObj = new Date(dateObj);
      }

      // Проверяем, что это валидная дата
      if (isNaN(dateObj.getTime())) {
        console.log("Invalid date:", dateObj);
        return "";
      }

      // Форматируем дату в формат dd.MM.yyyy
      const day = dateObj.getDate().toString().padStart(2, "0");
      const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
      const year = dateObj.getFullYear();

      return `${day}.${month}.${year}`;
    },
  };
});
