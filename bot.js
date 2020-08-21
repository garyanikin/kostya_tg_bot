const SOTRUDNIKI = 8;
const Telegraf = require("telegraf");
const bot = new Telegraf("1325458080:AAEmjeeoTXFeJfhsX_m7nBFvQlxE0uTxgMY");
const parseXlsx = require("excel").default;
// команда - сегодня
// предложение - кто сегодня в смене

// фамилия - числа месяца (день, ночь)

bot.on("text", (ctx) => {
  const message = ctx.message.text;

  if (!isNaN(message) && Number(message) > 0 && Number(message) < 32) {
    // Если сообщение число от 1 до 31

    const day = message;
    // Текущий месяц
    const month = new Date().getMonth() + 1;
    parseXlsx(month + ".xlsx").then((_data) => {
      const datesRowNum = 10;
      const data = _data.slice(0, datesRowNum + 1 + 2 * SOTRUDNIKI);
      const namesColumnNum = 3;
      const getCell = (row, column) => _getCell(data, row, column);
      const getRow = (row) => _getRow(data, row);
      // Строка с датами
      const datesRow = getRow(datesRowNum).map((cell) =>
        cell ? Number(cell) : ""
      );
      const dateRow = datesRow.reduce((acc, date, row) => {
        if (date === Number(day)) {
          return row;
        } else {
          return acc;
        }
      }, null);
      // информация о сменах в этот день
      let shifts = data
        .slice(datesRowNum + 1, datesRowNum + 1 + SOTRUDNIKI * 2)
        .reduce(
          (acc, row) => {
            let shift = isNaN(row[dateRow]) ? 0 : Number(row[dateRow]);
            if (acc[acc.length - 1].length < 2) {
              acc[acc.length - 1].push(shift);
            } else {
              acc.push([shift]);
            }

            return acc;
          },
          [[]]
        );

      // ФИО Сотрудников
      const workers = [...Array(SOTRUDNIKI)].map((v, key) =>
        getCell(datesRowNum + 1 + 2 * key, namesColumnNum)
      );

      shifts = shifts
        .map((shift, key) => {
          const [day, night] = shift;
          if (day || night) {
            const worker = workers[key];
            // очень странная логика
            if (Number(day) === 12 || Number(day) === 8) {
              // дневная смена
              return [`${worker} - день`];
            } else if (Number(day) === 3) {
              // ночная смена
              return [`${worker} - в ночь`];
            } else if (Number(day) === 9) {
              // ночная смена
              return [`${worker} - после ночной`];
            }

            return [""];
          } else {
            return null;
          }
        })
        .filter((shift) => shift !== null);

      let reply = shifts;

      const monthString = new Date().toLocaleString("ru", { month: "long" });
      ctx.replyWithMarkdown(
        `*${monthString[0].toUpperCase()}${monthString.substr(
          1
        )} ${day}:* \n\n${reply.join("\n")}`
      );
    });
  } else {
    ctx.reply("Этой даты нет :(");
  }
});

bot.launch();

function _getRow(data, row) {
  return data[row];
}

function _getCell(data, row, column) {
  return _getRow(data, row)[column];
}
