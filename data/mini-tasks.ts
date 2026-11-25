export type MiniTaskPort = "Невского" | "Приволжска"

export interface MiniTask {
  id: string
  title: string
  destination: string
  portChoice?: boolean
  dispatchNotice: string
  arrivalCargo: string
  cargoLabel: string
  loadingArea: "контейнере" | "гараже"
  storage: "контейнер" | "гараж"
  loadingVerb: string
  loadingLiftVerb: string
  unloadingVerb: string
  unloadingLiftVerb: string
}

export interface MiniTaskStage {
  id: string
  title: string
  lines: string[]
}

export const MINI_TASKS: MiniTask[] = [
  {
    id: "uniform",
    title: "Поставка формы",
    destination: "городской порт Невского / Приволжска",
    portChoice: true,
    dispatchNotice: "Заняли ЗИЛ для поставки рабочей формы.",
    arrivalCargo: "формы",
    cargoLabel: "Ящики",
    loadingArea: "контейнере",
    storage: "контейнер",
    loadingVerb: "ящик с формой",
    loadingLiftVerb: "ящик с формой",
    unloadingVerb: "ящик с формой",
    unloadingLiftVerb: "ящик с формой",
  },
  {
    id: "spare-parts",
    title: "Поставка запчастей",
    destination: "городской порт Приволжска",
    dispatchNotice: "Заняли ЗИЛ для поставки запчастей.",
    arrivalCargo: "запчастей",
    cargoLabel: "Коробки",
    loadingArea: "гараже",
    storage: "гараж",
    loadingVerb: "коробку с запчастями",
    loadingLiftVerb: "коробку с запчастями",
    unloadingVerb: "ящик с коробками",
    unloadingLiftVerb: "ящик с коробками",
  },
  {
    id: "brake-shoes",
    title: "Поставка башмаков",
    destination: "завод ЖБК г. Приволжска",
    dispatchNotice: "Заняли ЗИЛ для поставки башмаков.",
    arrivalCargo: "башмаков",
    cargoLabel: "Пачки башмаков",
    loadingArea: "гараже",
    storage: "гараж",
    loadingVerb: "пачку башмаков",
    loadingLiftVerb: "пачку башмаков",
    unloadingVerb: "пачку башмаков",
    unloadingLiftVerb: "пачку башмаков",
  },
  {
    id: "coal",
    title: "Поставка угля",
    destination: "шахту г. Мирного",
    dispatchNotice: "Заняли ЗИЛ для поставки угля для паровоза.",
    arrivalCargo: "угля",
    cargoLabel: "Мешки с углём",
    loadingArea: "гараже",
    storage: "гараж",
    loadingVerb: "мешок угля",
    loadingLiftVerb: "мешок с углём",
    unloadingVerb: "мешок угля",
    unloadingLiftVerb: "мешок угля",
  },
  {
    id: "diesel",
    title: "Поставка дизеля",
    destination: "шахту г. Мирного",
    dispatchNotice: "Заняли ЗИЛ для поставки дизельного топлива для тепловоза.",
    arrivalCargo: "дизельного топлива",
    cargoLabel: "Канистры с дизельным топливом",
    loadingArea: "гараже",
    storage: "гараж",
    loadingVerb: "канистру с дизельным топливом",
    loadingLiftVerb: "канистру с топливом",
    unloadingVerb: "канистру с топливом",
    unloadingLiftVerb: "канистру с дизельным топливом",
  },
]

export const MINI_TASK_RULES = [
  "Выполнение мини-заданий ограничено до 3 раз в неделю.",
  "Мини-задания доступны сотрудникам от ранга «Монтёр пути» (2).",
  "Для подтверждения выполнения необходимо сделать 5 скриншотов: отправление из РЖД, прибытие на место назначения, РП отыгровка погрузки, РП отыгровка разгрузки и прибытие в РЖД.",
  "Мини-задания выполняются на автомобиле ЗИЛ-131. При его отсутствии используется УАЗ-3309 «Буханка» — обязательно сделайте скриншот отсутствия ЗИЛа.",
  "При наличии напарника именно он выполняет погрузку и разгрузку.",
  "На месте загрузки не рекомендуется задерживаться более 3 минут.",
]

export const LOADING_UNLOADING_PHOTO = "/images/design-mode/mini-tasks-locations.jpeg"

export function getMiniTaskTemplate(
  task: MiniTask,
  options: { reportTag?: string; port?: MiniTaskPort; helperName?: string } = {},
): MiniTaskStage[] {
  const reportTag = options.reportTag?.trim() || "[ТЭГ]"
  const helperName = options.helperName?.trim()
  const partnerSuffix = helperName ? ` Напарник: ${helperName}.` : ""
  const destination = task.portChoice && options.port ? `городской порт ${options.port}` : task.destination
  const storageName = task.storage === "контейнер" ? "Контейнер" : "Гараж"
  const announce = (message: string, withPartner = false) =>
    `r ${reportTag} ${message}${withPartner ? partnerSuffix : ""}`

  return [
    {
      id: "departure",
      title: "Отправление",
      lines: [
        announce(task.dispatchNotice),
        announce(`Отправляемся в ${destination}.`, true),
      ],
    },
    {
      id: "arrival",
      title: "Прибытие",
      lines: [announce(`Прибыли в ${destination}. Начинаем погрузку ${task.arrivalCargo}.`, true)],
    },
    {
      id: "loading",
      title: "Погрузка",
      lines: [
        `do ${task.cargoLabel} в ${task.loadingArea}.`,
        `me достал ключ из кармана и открыл ${task.storage}`,
        `do ${storageName} открыт.`,
        `me взял ${task.loadingVerb} и положил в кузов авто`,
        `me подняв ${task.loadingLiftVerb}, поместил в автомобиль`,
        `do ${task.cargoLabel} в автомобиле.`,
        `me закрыл ${task.storage} и положил ключ в карман`,
      ],
    },
    {
      id: "return",
      title: "Отправление обратно",
      lines: [announce('Возвращаемся в здание ОАО "РЖД".', true)],
    },
    {
      id: "unloading",
      title: "Разгрузка",
      lines: [
        `do ${task.cargoLabel} в автомобиле.`,
        "me достал ключ из кармана и открыл дверь в подвал",
        "do Подвал здания открыт.",
        `me достал ${task.unloadingVerb} из автомобиля, и положил в подвал`,
        `me взяв ${task.unloadingLiftVerb} из кузова авто, поместил в подвал`,
        `do ${task.cargoLabel} в подвале здания.`,
        "me закрыл подвал и положил ключ в карман",
      ],
    },
    {
      id: "finish",
      title: "Прибытие в РЖД",
      lines: [announce('Прибыли в здание РЖД. Разгрузка окончена.', true)],
    },
  ]
}
