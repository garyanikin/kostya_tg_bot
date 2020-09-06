const Telegraf = require("telegraf");
const bot = new Telegraf("1383210322:AAHVQ3xbfIX1tCulP833Ze1eA9QJAgLxLdQ");
const parseXlsx = require("excel").default;
const Fuse = require("fuse.js");

async function getMonthData() {
  return {
    days: [1, 31],
    workers: [],
  };

  function getMonth() {}
}

(async () => {
  const DATA = await parseXlsx("./09.xlsx");
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

  console.log("WORKERS_COUNT", WORKERS.length);
  console.log("DAYS", DAYS);

  // BOT LOGIC
  
})();

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
    minMatchCharLength: 3,
    threshold: 0.2,
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
