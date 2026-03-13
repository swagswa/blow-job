import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { differenceInDays, format, isSameDay, startOfDay, eachDayOfInterval } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Check,
  Circle,
  LogOut,
  Droplets,
  Dumbbell,
  Footprints,
  Flame,
  Home,
  BookOpen,
  History,
  Wind,
} from "lucide-react";
import { cn } from "../lib/utils";

// Constants
const CYCLE_START_DATE = new Date(2026, 2, 10); // 10 March 2026 (Month is 0-indexed)
const TARGET_DATE = new Date(2026, 5, 1); // 1 June 2026
const CARNIVORE_START_DATE = new Date(2026, 4, 15); // 15 May 2026

const getMSKToday = () => {
  const now = new Date();
  const mskString = now.toLocaleString("en-US", { timeZone: "Europe/Moscow" });
  return startOfDay(new Date(mskString));
};

const GENERAL_RULES = [
  { label: "ТЕМП", value: "1 СЕК ПОДЪЁМ / 3 СЕК ОПУСКАНИЕ" },
  { label: "ПРОГРЕССИЯ", value: "+2.5 КГ ПРИ ВЫПОЛНЕНИИ НОРМЫ" },
];

type Exercise = {
  name: string;
  muscle: string;
  why: string;
  technique: string[];
  tempo: string;
  rest: string;
  sets: string;
  isTimer?: boolean;
  timerDuration?: number;
};

type WorkoutDay = {
  id: string;
  name: string;
  exercises: Exercise[];
};

const WORKOUT_CYCLE: WorkoutDay[] = [
  {
    id: "back",
    name: "Спина и Широчайшие",
    exercises: [
      {
        name: "Подтягивания широким хватом",
        muscle: "широчайшие (верхняя часть) + большая круглая",
        why: "Именно широкий хват и тяга грудью к перекладине активирует верхние волокна широчайших — те, что создают визуальные «крылья» сбоку.",
        technique: [
          "Хват шире плеч на 15–20 см",
          "В нижней точке — полное провисание, лопатки вверх (растяжка широчайших)",
          "Тянись именно грудью вверх, не головой",
          "В верхней точке — грудь касается или почти касается перекладины"
        ],
        tempo: "⬆️ 1 сек подъём / ⬇️ 3 сек опускание",
        rest: "90 секунд",
        sets: "4 × до отказа"
      },
      {
        name: "Тяга верхнего блока широким хватом",
        muscle: "широчайшие (средняя и нижняя часть) + зубчатые мышцы",
        why: "Это «страховка» для подтягиваний — добиваем те же волокна с контролируемым весом. Здесь важна амплитуда вниз.",
        technique: [
          "Небольшой наклон корпуса назад (~10–15°) — не больше, иначе включается поясница",
          "Локти ведёшь вниз, представь что хочешь засунуть их в задние карманы",
          "В нижней точке — пауза 1 сек, сожми широчайшие",
          "Вверх медленно, чувствуй как широчайшие растягиваются"
        ],
        tempo: "⬆️ 1 сек подъём / ⬇️ 3 сек опускание",
        rest: "60 секунд",
        sets: "4 × 10–12"
      },
      {
        name: "Тяга гантели в наклоне (унилатеральная)",
        muscle: "широчайшие (нижняя часть) + ромбовидные + задняя дельта",
        why: "Одна рука позволяет работать с большей амплитудой и лучше изолировать каждую сторону. Нижняя часть широчайших сужает талию визуально.",
        technique: [
          "Корпус параллельно полу или чуть выше, упор рукой и коленом",
          "Гантель в нижней точке — рука полностью прямая, плечо тянется вниз",
          "Тяни к тазобедренному суставу, не к груди — это ключ для нижних широчайших",
          "Локоть прижат к корпусу, не разводи в сторону"
        ],
        tempo: "⬆️ 1 сек подъём / ⬇️ 3 сек опускание",
        rest: "60 секунд после каждой руки",
        sets: "4 × 10–12 на руку"
      },
      {
        name: "Прямые тяги блока (Straight arm pulldown)",
        muscle: "широчайшие в изоляции, особенно верхние волокна",
        why: "Руки остаются прямыми, это выключает бицепс полностью и нагружает только широчайшие. Именно оно создаёт ощущение «крыльев».",
        technique: [
          "Стоя, верхний блок, прямая рукоять или канат",
          "Руки прямые, лёгкий наклон вперёд",
          "Тяни рукоять вниз дугой к бёдрам, представляй что давишь на что-то",
          "В нижней точке — задержка 2 сек, почувствуй сокращение сбоку под подмышкой",
          "Это не силовое — вес умеренный, работай на ощущение"
        ],
        tempo: "⬆️ 1 сек подъём / ⬇️ 3 сек опускание",
        rest: "45 секунд",
        sets: "3 × 15"
      },
      {
        name: "Лицевая тяга (Face Pulls)",
        muscle: "задняя дельта + надостная + ротаторная манжета",
        why: "Задняя дельта делает плечо объёмным в 3D. Плюс это здоровье ротаторной манжеты — без неё жимовые начнут болеть.",
        technique: [
          "Канат на уровне лица или чуть выше",
          "Тяни к уровню лба, не к шее",
          "В конечной точке — кулаки разведены в стороны, локти выше кистей",
          "Пауза 1 сек в конечной точке — прочувствуй заднюю дельту"
        ],
        tempo: "⬆️ 1 сек подъём / ⬇️ 3 сек опускание",
        rest: "30 секунд",
        sets: "4 × 20"
      },
      {
        name: "Сгибания с EZ-грифом (нейтральный хват)",
        muscle: "плечевая мышца (brachialis) + брахиорадиалис предплечья",
        why: "Прицельно нагружает плечевую мышцу под бицепсом. Именно она выталкивает бицепс вверх и создаёт пик.",
        technique: [
          "Берёшь за внутренние изгибы грифа — хват полунейтральный",
          "Локти прижаты к корпусу, не уходят вперёд",
          "Подъём без раскачки, строго силой предплечья"
        ],
        tempo: "⬆️ 1 сек подъём / ⬇️ 3 сек опускание",
        rest: "45 секунд",
        sets: "3 × 12"
      }
    ]
  },
  {
    id: "chest_shoulders",
    name: "Грудь и Плечи",
    exercises: [
      {
        name: "Махи гантелями в стороны (Lateral Raises)",
        muscle: "средняя (латеральная) головка дельты",
        why: "Упражнение №1 для твоей цели. Ничто другое не даёт горизонтальной ширины плеч так, как изолированная работа латеральной головки.",
        technique: [
          "Лёгкий наклон вперёд ~5°, руки чуть согнуты в локтях",
          "Подъём строго в стороны, не вперёд",
          "Мизинец выше большого пальца в верхней точке",
          "Не поднимай выше параллели с полом — выше включается трапеция"
        ],
        tempo: "⬆️ 1 сек подъём / ⬇️ 3 сек опускание",
        rest: "30–45 секунд",
        sets: "6 × 15–20"
      },
      {
        name: "Жим штанги на наклонной скамье (30–45°)",
        muscle: "верхняя часть большой грудной (ключичная головка)",
        why: "Верхняя грудь создаёт визуальный выступ и «полку» при взгляде сбоку. Штанга позволяет брать больший вес чем гантели.",
        technique: [
          "Угол скамьи строго 30° — выше уходишь на плечи",
          "Перед первым повтором: сведи лопатки и опусти плечи вниз. Держи это положение весь подход",
          "Хват чуть шире плеч, не слишком широкий",
          "Опускай гриф к верхней части груди (не к шее, не к середине)",
          "Локти под углом ~45° к корпусу, не строго в стороны",
          "Вверх — не выпрямляй полностью, держи напряжение в груди"
        ],
        tempo: "⬆️ 1 сек подъём / ⬇️ 3 сек опускание",
        rest: "90 секунд",
        sets: "4 × 10–12"
      },
      {
        name: "Сведение рук в тренажёре (Pec Fly)",
        muscle: "вся большая грудная, акцент на растяжение и форму",
        why: "Жим создаёт объём. Разводка создаёт форму и округлость. Это не силовое, это скульптурное.",
        technique: [
          "Руки слегка согнуты в локтях, держи эту форму весь подход",
          "Опускай до уровня, где чувствуешь сильное растяжение",
          "Вверх — дуга, как будто обнимаешь большое дерево",
          "В верхней точке — руки не встречаются, оставь 10 см"
        ],
        tempo: "⬆️ 1 сек подъём / ⬇️ 3 сек опускание",
        rest: "45 секунд",
        sets: "3 × 12–15"
      },
      {
        name: "Отжимания на брусьях с наклоном вперёд",
        muscle: "нижняя и средняя грудная + трицепс",
        why: "Наклон корпуса вперёд переключает нагрузку с трицепса на грудь. Лучшее упражнение для нижней границы грудной мышцы.",
        technique: [
          "Корпус наклонён вперёд ~20–30°",
          "Опускайся глубоко — ниже параллели, чувствуй растяжку",
          "Вверх медленно, не до полного выпрямления"
        ],
        tempo: "⬆️ 1 сек подъём / ⬇️ 3 сек опускание",
        rest: "60 секунд",
        sets: "3 × до отказа"
      },
      {
        name: "Обратная бабочка (Reverse Pec Deck)",
        muscle: "задняя дельта + ромбовидные",
        why: "Самая частая ошибка — трапеция перехватывает нагрузку. Задняя дельта маленькая и слабая — большой вес будет поднимать трапеция.",
        technique: [
          "Наклон корпуса вперёд ~45° — без наклона задняя дельта почти не работает",
          "Локти строго на уровне плеч или чуть ниже — никогда не выше",
          "Вес смешно лёгкий — скидывай до тех пор пока не почувствуешь работу именно сзади плеча",
          "Разводи руки медленно, тянись локтями назад и в стороны",
          "В верхней точке — пауза 2 секунды. Жжение сзади плеча = попал правильно"
        ],
        tempo: "⬆️ 1 сек подъём / ⬇️ 3 сек опускание",
        rest: "30 секунд",
        sets: "3 × 15"
      }
    ]
  },
  {
    id: "shoulders_arms_cardio",
    name: "Плечи повторно + Руки + Кардио",
    exercises: [
      {
        name: "Кабельные махи в стороны",
        muscle: "латеральная дельта",
        why: "Кабель даёт постоянное натяжение во всей амплитуде — особенно в нижней точке. Делай по одной руке.",
        technique: [
          "Блок на уровне бедра с противоположной стороны",
          "Тяни рукоять по дуге вверх в сторону",
          "В нижней точке — не расслабляй, держи натяжение"
        ],
        tempo: "⬆️ 1 сек подъём / ⬇️ 3 сек опускание",
        rest: "30 секунд между подходами",
        sets: "5 × 15–20 (каждая рука)"
      },
      {
        name: "Жим гантелей сидя",
        muscle: "передняя и средняя дельта + трицепс",
        why: "Жим над головой создаёт объём и толщину всего плечевого пояса — тот самый купол плеча который виден спереди.",
        technique: [
          "Скамья со спинкой строго под 90°, спина прижата к спинке",
          "Гантели поднимаешь на уровень плеч, локти чуть перед корпусом",
          "Ладони смотрят вперёд",
          "Жмёшь вверх над головой, но в верхней точке гантели не сводишь",
          "Не выпрямляй руки до конца — держи лёгкое сгибание в локтях"
        ],
        tempo: "⬆️ 1 сек подъём / ⬇️ 3 сек опускание",
        rest: "60–90 секунд",
        sets: "4 × 10–12"
      },
      {
        name: "Обратная бабочка (Reverse Pec Deck)",
        muscle: "задняя дельта",
        why: "Три дня подряд задняя дельта получает нагрузку — это даёт ей объём и 3D форму.",
        technique: [
          "Наклон корпуса вперёд ~45°",
          "Локти строго на уровне плеч или чуть ниже",
          "Вес смешно лёгкий",
          "Разводи руки медленно, тянись локтями назад и в стороны",
          "В верхней точке — пауза 2 секунды"
        ],
        tempo: "⬆️ 1 сек подъём / ⬇️ 3 сек опускание",
        rest: "30 секунд",
        sets: "3 × 20"
      },
      {
        name: "Подъём гантелей на бицепс",
        muscle: "бицепс (длинная головка = пик, короткая = ширина)",
        why: "Работай с супинацией: кисть разворачивается мизинцем вверх в верхней точке — это максимально включает длинную головку и пик.",
        technique: [
          "Стоя, строго без раскачки",
          "Разворот кисти в верхней точке",
          "Локти прижаты к корпусу, не уходят вперёд"
        ],
        tempo: "⬆️ 1 сек подъём / ⬇️ 3 сек опускание",
        rest: "45 секунд",
        sets: "4 × 12"
      },
      {
        name: "Разгибания на трицепс на блоке",
        muscle: "трицепс (все три головки, особенно латеральная)",
        why: "Трицепс занимает 2/3 объёма плеча. Он и создаёт ту «дугу» которую ты описывал.",
        technique: [
          "Локти прижаты к корпусу, не двигаются",
          "Разгибай полностью до блокировки — это важно для латеральной головки",
          "Медленно вверх"
        ],
        tempo: "⬆️ 1 сек подъём / ⬇️ 3 сек опускание",
        rest: "45 секунд",
        sets: "4 × 15"
      },
      {
        name: "Вакуум живота",
        muscle: "поперечная мышца живота (глубокий корсет)",
        why: "Это упражнение тренирует мышцу, которая буквально удерживает органы и сужает талию изнутри.",
        technique: [
          "Стоя или сидя",
          "Полный выдох до конца",
          "Втяни живот максимально внутрь и вверх, как будто хочешь коснуться пупком позвоночника",
          "Держи 20–30 секунд, дыши поверхностно"
        ],
        tempo: "⬆️ Удержание",
        rest: "45 секунд",
        sets: "5 × 30 секунд",
        isTimer: true,
        timerDuration: 30
      },
      {
        name: "Кардио — Аэробайк",
        muscle: "сжечь жир не трогая мышцы",
        why: "Аэробайк лучше обычного велотренажёра — подключает руки и плечевой пояс, поэтому расход калорий выше при том же пульсе.",
        technique: [
          "Длительность: 40–50 минут",
          "Темп: равномерный, спокойный — не интервалы, не спринты",
          "Пульс: 120–140 ударов в минуту",
          "Если пульс выше 150 — сбавляй темп",
          "Сопротивление: лёгкое или среднее",
          "Подсказка: Если задыхаешься и не можешь говорить — слишком быстро"
        ],
        tempo: "Равномерный",
        rest: "Без отдыха",
        sets: "1 сессия 40–50 минут"
      }
    ]
  },
  {
    id: "rest",
    name: "Отдых",
    exercises: [
      {
        name: "Ходьба",
        muscle: "Восстановление",
        why: "Ходьба 40 мин — не лежать.",
        technique: [
          "Прогулка на свежем воздухе",
          "Поддержание активности без нагрузки на ЦНС"
        ],
        tempo: "Свободный",
        rest: "-",
        sets: "40 минут"
      }
    ]
  }
];

type HabitData = Record<string, boolean>;

type ProgressRecord = {
  id?: string;
  date: string;
  completed: boolean;
  habit_data: HabitData;
  workout_type: string;
};

const DIET_PLAN = {
  training: [
    { id: 'chicken_450', name: 'Куриная грудка', amount: '450 г', macros: 'Б:99 Ж:10 У:0', kcal: 540 },
    { id: 'eggs_5', name: 'Яйца целые', amount: '5 шт', macros: 'Б:30 Ж:25 У:1', kcal: 350 },
    { id: 'protein_1', name: 'Протеин', amount: '1 скуп', macros: 'Б:24 Ж:1.5 У:2.5', kcal: 120 },
    { id: 'yogurt_140', name: 'Греческий йогурт', amount: '140 г', macros: 'Б:8 Ж:3 У:5', kcal: 85 },
    { id: 'rice_200', name: 'Рис/гречка (варёные)', amount: '200 г', macros: 'Б:5 Ж:1 У:44', kcal: 220 },
    { id: 'butter_20', name: 'Сливочное масло', amount: '20 г', macros: 'Б:0 Ж:16 У:0', kcal: 150 },
    { id: 'olive_oil', name: 'Оливковое масло', amount: '1 ст.л.', macros: 'Б:0 Ж:15 У:0', kcal: 135 },
    { id: 'hot_sauce', name: 'Острый соус (без сахара)', amount: 'Безлимит', macros: 'Б:0 Ж:0 У:0', kcal: 0 },
  ],
  rest: [
    { id: 'chicken_450_rest', name: 'Куриная грудка', amount: '450 г', macros: 'Б:99 Ж:10 У:0', kcal: 540 },
    { id: 'eggs_5_rest', name: 'Яйца целые', amount: '5 шт', macros: 'Б:30 Ж:25 У:1', kcal: 350 },
    { id: 'protein_1_rest', name: 'Протеин', amount: '1 скуп', macros: 'Б:24 Ж:1.5 У:2.5', kcal: 120 },
    { id: 'rice_100_rest', name: 'Рис/гречка (варёные)', amount: '100 г', macros: 'Б:2.5 Ж:0.5 У:22', kcal: 110 },
    { id: 'butter_20_rest', name: 'Сливочное масло', amount: '20 г', macros: 'Б:0 Ж:16 У:0', kcal: 150 },
    { id: 'veggies', name: 'Овощи (огурцы, салат)', amount: 'Безлимит', macros: 'Б:2 Ж:0 У:10', kcal: 50 },
    { id: 'hot_sauce_rest', name: 'Острый соус (без сахара)', amount: 'Безлимит', macros: 'Б:0 Ж:0 У:0', kcal: 0 },
  ]
};

const WEIGHTS = {
  training: {
    workout: 35,
    vacuum: 15,
    water: 10,
    sleep: 10,
    creatine: 5,
    chicken_450: 5,
    eggs_5: 5,
    protein_1: 4,
    yogurt_140: 3,
    rice_200: 3,
    butter_20: 2,
    olive_oil: 2,
    hot_sauce: 1,
  },
  rest: {
    vacuum: 25,
    water: 20,
    sleep: 15,
    chicken_450_rest: 10,
    eggs_5_rest: 8,
    protein_1_rest: 5,
    creatine: 5,
    rice_100_rest: 4,
    butter_20_rest: 3,
    veggies: 3,
    hot_sauce_rest: 2,
  }
};

const THRESHOLDS = {
  training: 70,
  rest: 60
};

const calculateScore = (record: ProgressRecord | undefined, isRestDay: boolean) => {
  if (!record) return 0;
  let score = 0;
  const weights = isRestDay ? WEIGHTS.rest : WEIGHTS.training;
  
  if (!isRestDay && record.completed) {
    score += weights.workout;
  }
  
  Object.entries(record.habit_data || {}).forEach(([key, value]) => {
    if (value && key in weights) {
      score += weights[key as keyof typeof weights];
    }
  });
  
  return Math.min(100, score);
};

const isDayCompleted = (record: ProgressRecord | undefined, isRestDay: boolean) => {
  const score = calculateScore(record, isRestDay);
  const threshold = isRestDay ? THRESHOLDS.rest : THRESHOLDS.training;
  return score >= threshold;
};

const ExerciseCard = ({ ex, index }: { ex: Exercise, index: number }) => {
  const [expanded, setExpanded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ex.timerDuration || 0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const toggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (timeLeft === 0) setTimeLeft(ex.timerDuration || 0);
    setIsRunning(!isRunning);
  };

  return (
    <div 
      onClick={() => setExpanded(!expanded)}
      className="flex flex-col gap-1 text-zinc-300 bg-zinc-900/50 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-zinc-800/50 transition-colors"
    >
      <div className="flex justify-between items-start">
        <span className="font-bold text-white text-sm">
          {index + 1}. {ex.name}
        </span>
        <span className="text-emerald-400 font-mono text-xs font-bold whitespace-nowrap ml-2 bg-emerald-500/10 px-2 py-1 rounded">
          {ex.sets}
        </span>
      </div>
      
      {!expanded && (
        <span className="text-xs text-zinc-500 line-clamp-1 mt-1">{ex.muscle}</span>
      )}

      {expanded && (
        <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Мышца</span>
            <p className="text-sm font-bold text-white mt-1">{ex.muscle}</p>
          </div>
          
          <div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Зачем это делать</span>
            <p className="text-sm text-zinc-300 mt-1 leading-relaxed">{ex.why}</p>
          </div>

          <div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Техника</span>
            <ol className="list-decimal list-inside text-sm text-zinc-300 mt-1 space-y-1.5">
              {ex.technique.map((step, i) => (
                <li key={i} className="leading-relaxed">{step}</li>
              ))}
            </ol>
          </div>

          <div className="bg-zinc-950 p-3 rounded-lg border border-white/5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-400">Темп:</span>
              <span className="text-xs font-medium text-emerald-400">{ex.tempo}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-400">Отдых:</span>
              <span className="text-xs font-medium text-amber-400">⏱ {ex.rest}</span>
            </div>
          </div>

          {ex.isTimer && (
            <div className="pt-2">
              <button 
                onClick={toggleTimer}
                className={cn(
                  "w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors",
                  isRunning ? "bg-amber-500/20 text-amber-500 border border-amber-500/50" : "bg-emerald-500/20 text-emerald-500 border border-emerald-500/50"
                )}
              >
                {isRunning ? `Пауза (${timeLeft} сек)` : timeLeft === 0 ? "Начать заново" : `Старт таймера (${timeLeft} сек)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function Dashboard({ session }: { session: any }) {
  const [activeTab, setActiveTab] = useState<'today' | 'program' | 'history'>('today');
  
  const [currentDate, setCurrentDate] = useState(getMSKToday());
  const [progress, setProgress] = useState<ProgressRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState<ProgressRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const daysUntilTarget = differenceInDays(TARGET_DATE, getMSKToday());

  // Calculate cycle day
  const daysSinceStart = differenceInDays(currentDate, CYCLE_START_DATE);
  const cycleIndex = ((daysSinceStart % 4) + 4) % 4; // Handle negative numbers safely
  const currentWorkout = WORKOUT_CYCLE[cycleIndex];

  useEffect(() => {
    fetchProgress(currentDate);
  }, [currentDate]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchProgress = async (date: Date) => {
    setLoading(true);
    const dateStr = format(date, "yyyy-MM-dd");

    try {
      const { data, error } = await supabase
        .from("progress")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("date", dateStr)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching progress:", error);
      }

      if (data) {
        setProgress(data);
      } else {
        // Default empty state
        setProgress({
          date: dateStr,
          completed: false,
          habit_data: {},
          workout_type: currentWorkout.name,
        });
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("progress")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false });

      if (error) throw error;
      if (data) setHistory(data);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const updateProgress = async (updates: Partial<ProgressRecord>) => {
    if (!progress) return;

    setSaving(true);
    const newProgress = { ...progress, ...updates };
    setProgress(newProgress as ProgressRecord);

    const dateStr = format(currentDate, "yyyy-MM-dd");

    try {
      const { error } = await supabase.from("progress").upsert(
        {
          user_id: session.user.id,
          date: dateStr,
          completed: newProgress.completed,
          habit_data: newProgress.habit_data,
          workout_type: currentWorkout.name,
        },
        { onConflict: "user_id, date" },
      );

      if (error) throw error;
    } catch (err) {
      console.error("Error saving progress:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleHabit = (habit: keyof HabitData) => {
    if (!progress) return;
    updateProgress({
      habit_data: {
        ...progress.habit_data,
        [habit]: !progress.habit_data[habit],
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const isToday = isSameDay(currentDate, getMSKToday());

  const toggleWorkoutCompletion = async (e: React.MouseEvent, day: Date, record: ProgressRecord | undefined, workoutName: string) => {
    e.stopPropagation();
    const dateStr = format(day, "yyyy-MM-dd");
    const newCompleted = !(record?.completed);
    
    // Optimistic update
    setHistory(prev => {
      const existing = prev.find(r => r.date === dateStr);
      if (existing) {
        return prev.map(r => r.date === dateStr ? { ...r, completed: newCompleted } : r);
      } else {
        return [...prev, {
          date: dateStr,
          completed: newCompleted,
          habit_data: {},
          workout_type: workoutName
        }];
      }
    });

    if (isSameDay(day, currentDate) && progress) {
      setProgress({ ...progress, completed: newCompleted });
    }

    try {
      const { error } = await supabase.from("progress").upsert(
        {
          user_id: session.user.id,
          date: dateStr,
          completed: newCompleted,
          habit_data: record?.habit_data || {},
          workout_type: workoutName,
        },
        { onConflict: "user_id, date" },
      );
      if (error) throw error;
    } catch (err) {
      console.error("Error toggling completion:", err);
    }
  };

  const renderToday = () => {
    const currentScore = calculateScore(progress, currentWorkout.id === "rest");
    const currentThreshold = currentWorkout.id === "rest" ? THRESHOLDS.rest : THRESHOLDS.training;
    const isSuccess = currentScore >= currentThreshold;

    return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Countdown */}
      <div className="text-center space-y-1">
        <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">
          Дней до 1 июня
        </p>
        <div className="text-6xl font-black tracking-tighter text-white drop-shadow-lg">
          {daysUntilTarget}
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-zinc-900/50 rounded-2xl p-2 border border-white/5">
        <button
          onClick={() => changeDate(-1)}
          className="p-3 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
        >
          &larr;
        </button>
        <div className="flex flex-col items-center">
          <span
            className={cn(
              "text-sm font-medium",
              isToday ? "text-emerald-400" : "text-zinc-400",
            )}
          >
            {isToday
              ? "Сегодня"
              : format(currentDate, "EEEE", { locale: ru })}
          </span>
          <span className="text-lg font-bold">
            {format(currentDate, "d MMMM yyyy", { locale: ru })}
          </span>
        </div>
        <button
          onClick={() => changeDate(1)}
          className="p-3 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
        >
          &rarr;
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Progress Bar */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 mb-6">
            <div className="flex justify-between items-end mb-2">
              <div>
                <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Прогресс дня</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={cn("text-2xl font-black", isSuccess ? "text-emerald-400" : "text-white")}>
                    {currentScore}%
                  </span>
                  <span className="text-zinc-500 text-sm font-medium">/ {currentThreshold}% минимум</span>
                </div>
              </div>
              {isSuccess && (
                <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Выполнено
                </div>
              )}
            </div>
            <div className="h-3 bg-zinc-950 rounded-full overflow-hidden border border-white/5 relative">
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-zinc-500 z-10" 
                style={{ left: `${currentThreshold}%` }}
              />
              <div 
                className={cn(
                  "h-full transition-all duration-1000 ease-out",
                  isSuccess ? "bg-emerald-500" : "bg-amber-500"
                )}
                style={{ width: `${currentScore}%` }}
              />
            </div>
          </div>

          {/* Workout Card */}
          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-900 opacity-50"></div>

            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-emerald-500 text-sm font-bold tracking-wider uppercase mb-1">
                  День {cycleIndex + 1} из 4
                </p>
                <h2 className="text-2xl font-bold">{currentWorkout.name}</h2>
              </div>
              <div className="p-3 bg-zinc-900 rounded-2xl border border-white/5">
                <Dumbbell className="w-6 h-6 text-zinc-300" />
              </div>
            </div>

            {currentWorkout.id !== "rest" && (
              <div className="space-y-4 mb-8">
                <ul className="space-y-3">
                  {currentWorkout.exercises.map((ex, i) => (
                    <ExerciseCard key={i} ex={ex} index={i} />
                  ))}
                </ul>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mt-6">
                  <p className="text-emerald-400 text-sm font-medium text-center">
                    Подъём 1 сек / Опускание 3 сек
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() =>
                updateProgress({ completed: !progress?.completed })
              }
              disabled={saving}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2",
                progress?.completed
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                  : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_20px_rgba(5,150,105,0.4)]",
              )}
            >
              {progress?.completed ? (
                <>
                  <Check className="w-6 h-6" />
                  Тренировка выполнена
                  <span className="text-xs font-bold text-emerald-500/70 bg-emerald-500/10 px-2 py-1 rounded ml-2">
                    +{WEIGHTS.training.workout}%
                  </span>
                </>
              ) : (
                <>
                  Начать тренировку
                  <span className="text-xs font-bold text-white/70 bg-white/20 px-2 py-1 rounded ml-2">
                    +{WEIGHTS.training.workout}%
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Habits Tracker */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold px-2">Привычки</h3>
            <div className="grid grid-cols-2 gap-3">
              <HabitCard
                title="Вода (3л)"
                icon={<Droplets className="w-5 h-5" />}
                active={progress?.habit_data.water || false}
                onClick={() => toggleHabit("water")}
                weight={currentWorkout.id === "rest" ? WEIGHTS.rest.water : WEIGHTS.training.water}
              />
              <HabitCard
                title="Креатин (5г)"
                icon={<Dumbbell className="w-5 h-5" />}
                active={progress?.habit_data.creatine || false}
                onClick={() => toggleHabit("creatine")}
                weight={currentWorkout.id === "rest" ? WEIGHTS.rest.creatine : WEIGHTS.training.creatine}
              />
              <HabitCard
                title="Сон (7-8ч)"
                icon={<Home className="w-5 h-5" />}
                active={progress?.habit_data.sleep || false}
                onClick={() => toggleHabit("sleep")}
                weight={currentWorkout.id === "rest" ? WEIGHTS.rest.sleep : WEIGHTS.training.sleep}
              />
              <HabitCard
                title="Вакуум живота (5 мин)"
                icon={<Wind className="w-5 h-5" />}
                active={progress?.habit_data.vacuum || false}
                onClick={() => toggleHabit("vacuum")}
                weight={currentWorkout.id === "rest" ? WEIGHTS.rest.vacuum : WEIGHTS.training.vacuum}
              />
            </div>

            {/* Diet Tracker */}
            <div className="mt-8 space-y-4">
              <div className="flex justify-between items-end px-2">
                <h3 className="text-lg font-bold">Рацион</h3>
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider bg-emerald-500/10 px-2 py-1 rounded-lg">
                  {currentWorkout.id === "rest" ? "~1320 ккал" : "~1800 ккал"}
                </span>
              </div>
              <div className="space-y-2">
                {(currentWorkout.id === "rest" ? DIET_PLAN.rest : DIET_PLAN.training).map((food) => (
                  <div
                    key={food.id}
                    onClick={() => toggleHabit(food.id)}
                    className={cn(
                      "p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer",
                      progress?.habit_data[food.id]
                        ? "bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                        : "bg-zinc-900 border-white/10 hover:bg-zinc-800"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                          progress?.habit_data[food.id]
                            ? "bg-emerald-500 border-emerald-500 text-black"
                            : "border-zinc-600 text-transparent"
                        )}
                      >
                        <Check className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className={cn("font-bold text-sm", progress?.habit_data[food.id] ? "text-emerald-100" : "text-white")}>
                          {food.name} <span className="text-zinc-500 font-normal">· {food.amount}</span>
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          {food.macros} <span className="text-emerald-500/70 ml-1">{food.kcal} ккал</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderProgram = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center space-y-2 mt-4">
        <p className="text-emerald-500 text-xs font-bold tracking-widest uppercase">Персональная программа Robo</p>
        <h2 className="text-3xl font-black tracking-tight">ПЛАН ТРЕНИРОВОК</h2>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center justify-center p-3 bg-zinc-900/50 rounded-2xl border border-white/5 text-center">
          <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider mb-1">Старт (11 марта)</span>
          <span className="text-white font-mono font-bold text-sm">75 кг / 18%</span>
        </div>
        <div className="flex flex-col items-center justify-center p-3 bg-zinc-900/50 rounded-2xl border border-emerald-500/20 text-center">
          <span className="text-emerald-500 text-[9px] uppercase font-bold tracking-wider mb-1">Прогноз (1 июня)</span>
          <span className="text-emerald-400 font-mono font-bold text-sm">71-72 кг / 12-13%</span>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-emerald-500/20 rounded-2xl p-4 grid grid-cols-1 gap-3">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <span className="text-zinc-400 text-xs font-bold">ЦЕЛЕВОЙ БЕЛОК</span>
          <span className="text-emerald-400 font-mono text-sm font-bold">150-160 г</span>
        </div>
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <span className="text-zinc-400 text-xs font-bold">ТРЕНИРОВОЧНЫЙ ДЕНЬ</span>
          <span className="text-emerald-400 font-mono text-sm font-bold">1800 ккал</span>
        </div>
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <span className="text-zinc-400 text-xs font-bold">ДЕНЬ ОТДЫХА</span>
          <span className="text-emerald-400 font-mono text-sm font-bold">1200 ккал</span>
        </div>
        {GENERAL_RULES.map((rule, i) => (
          <div key={i} className="flex justify-between items-center border-b border-white/5 pb-3 last:border-0 last:pb-0">
            <span className="text-zinc-400 text-xs font-bold">{rule.label}</span>
            <span className="text-emerald-400 font-mono text-sm font-bold">{rule.value}</span>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {WORKOUT_CYCLE.filter(w => w.id !== 'rest').map((workout, index) => (
          <div key={workout.id} className="bg-zinc-950 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-900 opacity-50"></div>
            <div className="flex items-baseline gap-3 mb-6 border-b border-white/10 pb-4">
              <span className="text-4xl font-black text-white/10">0{index + 1}</span>
              <h3 className="text-xl font-bold uppercase tracking-wide">{workout.name}</h3>
            </div>
            <div className="space-y-5">
              {workout.exercises.map((ex, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm uppercase text-zinc-200 pr-4">{ex.name}</span>
                    <span className="text-emerald-400 font-mono text-xs font-bold whitespace-nowrap">{ex.sets}</span>
                  </div>
                  <span className="text-xs text-zinc-500 italic">{ex.muscle}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  };

  const renderHistory = () => {
    const allDays = eachDayOfInterval({ start: CYCLE_START_DATE, end: TARGET_DATE });
    const mskToday = getMSKToday();
    
    let completedCount = 0;
    let missedCount = 0;
    
    allDays.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const record = history.find(r => r.date === dateStr);
      if (record?.completed) {
        completedCount++;
      } else if (day < mskToday) {
        missedCount++;
      }
    });
    
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="text-center space-y-2 mt-4 mb-6">
          <h2 className="text-3xl font-black tracking-tight">ВСЕ ДНИ</h2>
          <p className="text-zinc-400 text-sm">Полный план до 1 июня.</p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-wider mb-1">Всего</span>
            <span className="text-white font-black text-xl">{allDays.length}</span>
          </div>
          <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-emerald-500 text-[9px] font-bold uppercase tracking-wider mb-1">Сделано</span>
            <span className="text-emerald-400 font-black text-xl">{completedCount}</span>
          </div>
          <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-red-500 text-[9px] font-bold uppercase tracking-wider mb-1">Пропуски</span>
            <span className="text-red-400 font-black text-xl">{missedCount}</span>
          </div>
        </div>

        {historyLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {allDays.map(day => {
              const dateStr = format(day, "yyyy-MM-dd");
              const record = history.find(r => r.date === dateStr);
              const mskToday = getMSKToday();
              const isCurrentDay = isSameDay(day, mskToday);
              const isFutureDay = day > mskToday;
              const dayNumber = differenceInDays(day, CYCLE_START_DATE) + 1;
              
              const daysSinceStart = differenceInDays(day, CYCLE_START_DATE);
              const cycleIndex = ((daysSinceStart % 4) + 4) % 4;
              const workoutName = WORKOUT_CYCLE[cycleIndex].name;
              
              const isRestDay = WORKOUT_CYCLE[cycleIndex].id === "rest";
              const totalHabits = 4 + (isRestDay ? DIET_PLAN.rest.length : DIET_PLAN.training.length);
              const habitsCount = record ? Object.values(record.habit_data).filter(Boolean).length : 0;

              return (
                <div 
                  key={dateStr}
                  onClick={() => {
                    setCurrentDate(day);
                    setActiveTab('today');
                    window.scrollTo(0, 0);
                  }}
                  className={cn(
                    "w-full text-left border rounded-2xl p-4 flex flex-col gap-3 transition-all cursor-pointer",
                    isCurrentDay 
                      ? "bg-zinc-900/80 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                      : isFutureDay
                        ? "bg-zinc-950/50 border-white/5 opacity-60"
                        : "bg-zinc-900/50 border-white/5 hover:bg-zinc-800/80"
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                        <span className="text-[11px] font-black text-zinc-500 uppercase tracking-wider whitespace-nowrap">День {dayNumber}</span>
                        <span className="text-[11px] font-bold text-zinc-400 hidden sm:inline">•</span>
                        <span className="text-[11px] font-bold text-zinc-400 capitalize whitespace-nowrap">{format(day, "d MMM, EEE", { locale: ru })}</span>
                      </div>
                      <p className={cn("font-bold text-sm sm:text-base truncate", isFutureDay ? "text-zinc-500" : "text-white")}>
                        {workoutName}
                      </p>
                      
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {record?.completed ? (
                          <div className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 w-fit">
                            <Check className="w-3 h-3" /> ВЫПОЛНЕНО
                          </div>
                        ) : isCurrentDay ? (
                          <div className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-[9px] font-bold w-fit">
                            СЕГОДНЯ
                          </div>
                        ) : isFutureDay ? (
                          <div className="bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded text-[9px] font-bold w-fit">
                            ОЖИДАЕТСЯ
                          </div>
                        ) : (
                          <div className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-[9px] font-bold w-fit">
                            ПРОПУСК
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => toggleWorkoutCompletion(e, day, record, workoutName)}
                      className={cn(
                        "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 mt-1",
                        record?.completed 
                          ? "bg-emerald-500 border-emerald-500 text-black" 
                          : "border-zinc-600 text-transparent hover:border-emerald-500"
                      )}
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Mini habits indicator */}
                  {!isFutureDay && (
                    <div className="flex items-center gap-2 pt-3 mt-2 border-t border-white/5">
                      <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Привычки:</div>
                      <div className="flex gap-1">
                        {Array.from({ length: totalHabits }).map((_, i) => {
                          const isCompleted = record && i < habitsCount;
                          return (
                            <div 
                              key={i} 
                              className={cn(
                                "w-1.5 h-1.5 rounded-full", 
                                isCompleted ? "bg-emerald-500" : "bg-zinc-700"
                              )} 
                            />
                          );
                        })}
                      </div>
                      <div className="text-[10px] text-zinc-500 ml-auto">{habitsCount}/{totalHabits}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-black">
            R
          </div>
          <h1 className="font-bold tracking-tight text-lg">ROBO Sync</h1>
        </div>
        <button
          onClick={handleSignOut}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="max-w-md mx-auto p-4">
        {activeTab === 'today' && renderToday()}
        {activeTab === 'program' && renderProgram()}
        {activeTab === 'history' && renderHistory()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-xl border-t border-white/10 z-50 pb-safe">
        <div className="max-w-md mx-auto flex justify-around p-2">
          <button 
            onClick={() => setActiveTab('today')} 
            className={cn(
              "flex flex-col items-center p-2 rounded-xl transition-all w-20", 
              activeTab === 'today' ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Home className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Сегодня</span>
          </button>
          <button 
            onClick={() => setActiveTab('program')} 
            className={cn(
              "flex flex-col items-center p-2 rounded-xl transition-all w-20", 
              activeTab === 'program' ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <BookOpen className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Программа</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')} 
            className={cn(
              "flex flex-col items-center p-2 rounded-xl transition-all w-20", 
              activeTab === 'history' ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <History className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Все дни</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function HabitCard({
  title,
  icon,
  active,
  onClick,
  weight,
}: {
  title: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  weight?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start p-3 sm:p-4 rounded-2xl border transition-all text-left",
        active
          ? "bg-emerald-950/30 border-emerald-500/50"
          : "bg-zinc-900 border-white/10 hover:bg-zinc-800",
      )}
    >
      <div className="flex justify-between w-full mb-2 sm:mb-3">
        <div
          className={cn(
            "p-2 rounded-xl",
            active
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-zinc-800 text-zinc-400",
          )}
        >
          {icon}
        </div>
        <div className="flex items-center gap-2">
          {weight && (
            <span className="text-[10px] font-bold text-emerald-500/70 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              +{weight}%
            </span>
          )}
          {active ? (
            <Check className="w-5 h-5 text-emerald-500" />
          ) : (
            <Circle className="w-5 h-5 text-zinc-600" />
          )}
        </div>
      </div>
      <span
        className={cn(
          "font-medium text-xs sm:text-sm leading-tight",
          active ? "text-emerald-100" : "text-zinc-300",
        )}
      >
        {title}
      </span>
    </button>
  );
}
