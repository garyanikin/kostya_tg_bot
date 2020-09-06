const Telegraf = require("telegraf");
const bot = new Telegraf("1325458080:AAEmjeeoTXFeJfhsX_m7nBFvQlxE0uTxgMY");
const parseXlsx = require("excel").default;
const Fuse = require("fuse.js");
const fs = require("fs");
const _ = require("lodash");

// 13 - получить распинаие на 13 число месяца
// 13 УПФР-1 - получить расписание на 13 число месяца для УПФР-1
// Третьяков - получить расписание для третьякова
// УПФР-1 - получть расписание для УПФР-1

async function getMonthData() {
  const month = _getMonth();
  let DATA = [];

  try {
    if (fs.existsSync(`./${month}.xlsx`)) {
      DATA.push(await parseFile(`./${month}.xlsx`));
    }
    if (fs.existsSync(`./${month}_2.xlsx`)) {
      DATA.push(await parseFile(`./${month}_2.xlsx`));
    }
  } catch (err) {
    console.error(err);
    return {
      DAYS: null,
      WORKES: null,
      GROUPS: [],
    };
  }

  if (DATA.length > 1) {
    return joinData(DATA);
  } else {
    return DATA[0];
  }

  function _getMonth() {
    return new Date().getMonth() + 1;
  }

  function joinData(DATA) {
    return {
      DAYS: DATA[0].DAYS.concat(DATA[1].DAYS),
      WORKERS: joinWorkers(DATA[0].WORKERS, DATA[1].WORKERS),
      GROUPS: _.uniq(DATA[0].GROUPS.concat(DATA[1].GROUPS)),
    };

    function joinWorkers(workers, workers2) {
      const result = [...workers];
      workers2.map((worker) => {
        const index = _.findIndex(result, ({ name }) => {
          return name.toLowerCase() == worker.name.toLowerCase();
        });

        if (index === -1) {
          result.push({ ...worker, days: [...Array(15), ...worker.days] });
        } else {
          result[index].days = result[index].days.concat(worker.days);
        }
      });
      return result;
    }
  }

  async function parseFile(file) {
    const DATA = await parseXlsx(file);
    const DATES_ROW = 9;
    let WORKERS = [];
    // PARSE DAYS
    const isDay = (col) => Number(DATA[DATES_ROW][col]) || false;
    let activeCol = 0;
    const DAYS = [];
    while (isDay(5 + activeCol)) {
      DAYS.push(Number(DATA[DATES_ROW][5 + activeCol]));
      activeCol++;
    }
    // DAYS
    const getDays = (worker) => {
      return DAYS.map((v, index) => {
        const day = worker[5 + index];
        return day != "" && day != undefined ? day : undefined;
      });
    };

    const isWorker = (line) => !isNaN(getWorker(line)[0]);
    const getWorker = (line) => DATA[line];
    let activeRow = 1;
    let GROUP;
    let GROUPS = [];
    while (isWorker(DATES_ROW + activeRow)) {
      const worker = getWorker(DATES_ROW + activeRow);
      const brigada = Number(worker[1]) || null;
      const name = worker[3];
      const post = worker[4];
      const days = getDays(worker);
      const currentGroup = worker[2] || GROUP;
      GROUP = currentGroup;

      // Add group
      if (!GROUPS.includes(GROUP)) GROUPS.push(GROUP);

      WORKERS.push({
        id: activeRow,
        name,
        post,
        days,
        brigada,
        group: GROUP,
      });
      activeRow++;
    }

    return {
      DAYS,
      WORKERS,
      GROUPS,
    };
  }
}

(async () => {
  //   const { DAYS, WORKERS, GROUPS } = await getMonthData();

  // BOT LOGIC
  bot.on("text", async (ctx) => {
    const { DAYS, WORKERS, GROUPS } = await getMonthData();

    const message = ctx.message.text;

    if (WORKERS === null) ctx.reply("не удалось загрузить файл с расписанием");

    console.log("received message: ", message);
    if (!isNaN(message) && Number(message) > 0 && Number(message) < 32) {
      // Если сообщение число от 1 до 31

      const day = message;
      // Текущий месяц
      const reply = getDay(WORKERS, day);
      console.log("getDay");
      ctx.reply(reply);
    } else if (isDayWithGroup(message)) {
      const splitted = message.split(" ");
      const day = Number(splitted.shift());
      const group = splitted.join(" ");
      console.log("getGroupDay", day, group);
      const reply = getGroupDay(WORKERS, day, group);
      ctx.reply(reply);
    } else if (isGroup(GROUPS, message)) {
      console.log("getGroup");
      ctx.reply(getGroup(WORKERS, message));
    } else {
      console.log("getWorker");
      ctx.reply(getWorkerDays(WORKERS, message));
    }
  });

  bot.launch();
})();

// Проверяет является ли сообщение датой с группой
// 13 Упфп-1
function isDayWithGroup(message) {
  if (message.includes(" ")) {
    return !isNaN(message.split(" ")[0]);
  } else {
    return false;
  }
}

function isGroup(groups, message) {
  const fuse = new Fuse(groups, {
    threshold: 0.3,
  });

  return !!fuse.search(message).length;
}

function getMonth() {
  return new Date().toLocaleString("ru", { month: "long" });
}

// Расписание на этот день (все сотрудники)
function getDay(workers, day) {
  let GROUP;
  const result = workers
    .filter(({ days }) => days[day - 1] !== undefined)
    .map(({ name, days, group }) => {
      if (days === "") return null;

      if (GROUP != group) {
        GROUP = group;
        return `\n${group}\n${name} - ${days[day - 1]}`;
      }

      return `${name} - ${days[day - 1]}`;
    })
    .join("\n");

  return result || "Ничего не найдено";
}

// Расписание на весь месяц по ФИО
function getWorkerDays(workers, name) {
  const result = _getWorkersBy(workers, "name", name).map(
    ({ item: worker }) => {
      const workingDays = worker.days
        .map((time, day) =>
          time != undefined
            ? `${Number(day) + 1} ${getMonth()} - ${time}`
            : null
        )
        .filter((str) => str !== null);

      return `${worker.name}:\n${workingDays.join("\n")}`;
    }
  );

  return result.length ? result.join("\n") : "Ничего не найдено";
}

function _getWorkersBy(workers, key, value) {
  const fuse = new Fuse(workers, {
    threshold: 0.3,
    keys: [key],
  });

  return fuse.search(value);
}

// Расаписание на всё подразделение
function getGroup(workers, group) {
  let GROUP;
  const result = _getWorkersBy(workers, "group", group).map(
    ({ item: worker }) => {
      const workingDays = worker.days
        .map((time, day) =>
          time != undefined
            ? `${Number(day) + 1} ${getMonth()} - ${time}`
            : null
        )
        .filter((str) => str !== null);

      if (GROUP != worker.group) {
        GROUP = worker.group;
        return `\n${worker.group}\n${worker.name}:\n${workingDays.join("\n")}`;
      }

      return `${worker.name}:\n${workingDays.join("\n")}`;
    }
  );

  return result.length ? result.join("\n") : "Ничего не найдено";
}

// Расписание на этот день для конкретного подразределния
function getGroupDay(workers, day, group) {
  let GROUP;
  const result = _getWorkersBy(workers, "group", group)
    .map(({ item: worker }) => {
      if (worker.days[day + 1] === undefined) return null;

      if (GROUP != worker.group) {
        GROUP = worker.group;
        return `\n${worker.group}\n${worker.name} - ${worker.days[day + 1]}`;
      }

      return `${worker.name} - ${worker.days[day + 1]}`;
    })
    .filter((str) => str != null);

  return result.length ? result.join("\n") : "Ничего не найдено";
}
