export interface MiniTask {
  id: string
  title: string
  cargo: string
  destination: string
  loadingLocation: string
  loadingArea: "container" | "garage"
  loadingVerb: string
  unloadingItem: string
}

export const MINI_TASKS: MiniTask[] = [
  {
    id: "uniform",
    title: "Поставка формы",
    cargo: "Ящики с формой",
    destination: "городской порт Невского / Приволжска",
    loadingLocation: "контейнере",
    loadingArea: "container",
    loadingVerb: "ящик с формой",
    unloadingItem: "ящик с формой",
  },
  {
    id: "spare-parts",
    title: "Поставка запчастей",
    cargo: "Коробки с запчастями",
    destination: "городской порт Приволжска",
    loadingLocation: "гараже",
    loadingArea: "garage",
    loadingVerb: "коробку с запчастями",
    unloadingItem: "ящик с коробками",
  },
  {
    id: "brake-shoes",
    title: "Поставка башмаков",
    cargo: "Пачки башмаков",
    destination: "завод ЖБК г. Приволжска",
    loadingLocation: "гараже",
    loadingArea: "garage",
    loadingVerb: "пачку башмаков",
    unloadingItem: "пачку башмаков",
  },
  {
    id: "coal",
    title: "Поставка угля",
    cargo: "Мешки с углём",
    destination: "шахту г. Мирного",
    loadingLocation: "гараже",
    loadingArea: "garage",
    loadingVerb: "мешок угля",
    unloadingItem: "мешок угля",
  },
  {
    id: "diesel",
    title: "Поставка дизеля",
    cargo: "Канистры с дизельным топливом",
    destination: "шахту г. Мирного",
    loadingLocation: "гараже",
    loadingArea: "garage",
    loadingVerb: "канистру с дизельным топливом",
    unloadingItem: "канистру с топливом",
  },
]

export const MINI_TASK_RULES = [
  "Выполнение ограничено тремя мини-заданиями в неделю.",
  "Мини-задания доступны сотрудникам от должности «Монтёр пути» (ранг 2).",
  "Для подтверждения подготовьте пять скриншотов: отправление из РЖД, прибытие на место назначения, RP-погрузка, RP-разгрузка и возвращение в РЖД.",
  "Используйте ЗИЛ-131. Если его нет, допускается УАЗ-3309 «Буханка» — обязательно приложите скриншот отсутствия ЗИЛа.",
  "Если есть напарник, погрузку и разгрузку выполняет именно он.",
  "На месте загрузки не рекомендуется задерживаться дольше трёх минут.",
]

export const LOADING_UNLOADING_PHOTO = "https://i.imgur.com/uU3s5Qz.jpeg"

export function getMiniTaskTemplate(task: MiniTask) {
  const isContainer = task.loadingArea === "container"
  const storageName = isContainer ? "Контейнер" : "Гараж"
  const openStorage = isContainer ? "открыл контейнер" : "открыл гараж"
  const closeStorage = isContainer ? "закрыл контейнер" : "закрыл гараж"
  const cargoCount = task.cargo

  return [
    "Отправление:",
    `r [ТЭГ] Заняли ЗИЛ для ${task.title.toLowerCase().replace(/^поставка/, "поставки")}.`,
    `r [ТЭГ] Отправляемся в ${task.destination}. Напарник: Имя Фамилия (если имеется).`,
    "",
    "Прибытие на место загрузки:",
    `r [ТЭГ] Прибыли в ${task.destination}. Начинаем погрузку. Напарник: Имя Фамилия (если имеется).`,
    "",
    "Погрузка:",
    `do ${cargoCount} в ${task.loadingLocation}.`,
    `me достал ключ из кармана и ${openStorage}`,
    `do ${storageName} открыт.`,
    `me взял ${task.loadingVerb} и положил в кузов авто`,
    `me подняв ${task.loadingVerb}, поместил в автомобиль`,
    `do ${cargoCount} в автомобиле.`,
    `me ${closeStorage} и положил ключ в карман`,
    "",
    "Возвращение:",
    'r [ТЭГ] Возвращаемся в здание ОАО "РЖД". Напарник: Имя Фамилия (если имеется).',
    "",
    "Разгрузка:",
    `do ${cargoCount} в автомобиле.`,
    "me достал ключ из кармана и открыл дверь в подвал",
    "do Подвал здания открыт.",
    `me достал ${task.unloadingItem} из автомобиля и положил в подвал`,
    `me взяв ${task.unloadingItem} из кузова авто, поместил в подвал`,
    `do ${cargoCount} в подвале здания.`,
    "me закрыл подвал и положил ключ в карман",
    "",
    "Прибытие в РЖД:",
    'r [ТЭГ] Прибыли в здание РЖД. Разгрузка окончена. Напарник: Имя Фамилия (если имеется).',
  ].join("\n")
}
