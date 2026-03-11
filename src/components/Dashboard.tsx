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
  { label: "ОТДЫХ", value: "45–60 СЕК" },
  { label: "ТЕМП", value: "1 СЕК ВЗРЫВ / 3 СЕК НЕГАТИВ" },
  { label: "ПРОГРЕССИЯ", value: "+2.5 КГ ПРИ ВЫПОЛНЕНИИ НОРМЫ" },
];

type Exercise = {
  name: string;
  note: string;
  sets: string;
};

type WorkoutDay = {
  id: string;
  name: string;
  exercises: Exercise[];
};

const WORKOUT_CYCLE: WorkoutDay[] = [
  {
    id: "back",
    name: "Спина и Осанка",
    exercises: [
      { name: "Подтягивания", note: "Широкий хват, тянись грудью к перекладине", sets: "3 X ДО ОТКАЗА" },
      { name: "Тяга верхнего блока", note: "Локти веди строго вниз, не отклоняйся назад", sets: "4 X 12" },
      { name: "Тяга гантели в наклоне", note: "Корпус параллельно полу, тяни к поясу", sets: "3 X 12 (на руку)" },
      { name: "Тяга горизонтального блока", note: "Максимальное сведение лопаток в пике", sets: "3 X 12" },
      { name: "Лицевая тяга (Face Pulls)", note: "Тяни канат к уровню лба, разводи кулаки", sets: "4 X 20" },
      { name: "Молотки (Hammer Curls)", note: "Кисти смотрят друг на друга", sets: "3 X 12" },
    ],
  },
  {
    id: "chest",
    name: "Грудь и Плечи",
    exercises: [
      { name: "Жим гантелей на накл. скамье", note: "Угол скамьи строго 30°–45°", sets: "3 X 12" },
      { name: "Жим в тренажере на грудь", note: "Локти не задирай, держи чуть ниже плеч", sets: "3 X 15" },
      { name: "Отжимания на брусьях", note: "Корпус чуть вперед для акцента на грудь", sets: "3 X 12-15" },
      { name: "Махи гантелями в стороны", note: "Мизинец чуть выше большого пальца", sets: "5 X 15-20" },
      { name: "Обратная бабочка (назад)", note: "Не включай трапецию, работай плечом", sets: "3 X 15" },
      { name: "Разгибание на трицепс", note: "Локти прижаты к корпусу", sets: "4 X 15" },
    ],
  },
  {
    id: "legs",
    name: "Ноги и Таз",
    exercises: [
      { name: "Жим ногами", note: "Ноги на ширине плеч, не выпрямляй до конца", sets: "4 X 15" },
      { name: "Выпады с гантелями", note: "Шаг средней длины, колено не заваливай", sets: "3 X 20 ШАГОВ" },
      { name: "Румынская тяга", note: "Опускай до середины голени, спина прямая", sets: "3 X 12" },
      { name: "Ягодичный мостик", note: "Пауза 1 сек в верхней точке", sets: "4 X 15" },
      { name: "Сгибание ног лежа", note: "Без рывков, плавный возврат", sets: "4 X 15" },
      { name: "Планка", note: "Держи тело ровно, без прогиба в пояснице", sets: "3 X 90 СЕК" },
    ],
  },
  {
    id: "rest",
    name: "Отдых",
    exercises: [
      { name: "Восстановление", note: "Сон 8+ часов, массаж или раскатка", sets: "—" },
      { name: "Легкая растяжка", note: "Упор на грудные и сгибатели бедра", sets: "10-15 МИН" },
      { name: "Прогулка", note: "Легкое кардио для кровообращения", sets: "10К ШАГОВ" },
    ],
  },
];

type HabitData = {
  protein: boolean;
  creatine: boolean;
  water: boolean;
  steps: boolean;
  carnivore: boolean;
};

type ProgressRecord = {
  id?: string;
  date: string;
  completed: boolean;
  habit_data: HabitData;
  workout_type: string;
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

  const isCarnivoreAvailable = currentDate >= CARNIVORE_START_DATE || currentWorkout.id === "rest";

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
          habit_data: {
            protein: false,
            creatine: false,
            water: false,
            steps: false,
            carnivore: false,
          },
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
          habit_data: { protein: false, creatine: false, water: false, steps: false, carnivore: false },
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
          habit_data: record?.habit_data || { protein: false, creatine: false, water: false, steps: false, carnivore: false },
          workout_type: workoutName,
        },
        { onConflict: "user_id, date" },
      );
      if (error) throw error;
    } catch (err) {
      console.error("Error toggling completion:", err);
    }
  };

  const renderToday = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Countdown */}
      <div className="text-center space-y-1">
        <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">
          Дней до 1 июня
        </p>
        <div className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500">
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
                    <li
                      key={i}
                      className="flex flex-col gap-1 text-zinc-300 bg-zinc-900/50 p-3 rounded-xl border border-white/5"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-white text-sm">
                          {i + 1}. {ex.name}
                        </span>
                        <span className="text-emerald-400 font-mono text-xs font-bold whitespace-nowrap ml-2 bg-emerald-500/10 px-2 py-1 rounded">
                          {ex.sets}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500">{ex.note}</span>
                    </li>
                  ))}
                </ul>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mt-6">
                  <p className="text-emerald-400 text-sm font-medium text-center">
                    Взрыв 1 сек / Негатив 3 сек. Отдых 45-60 сек
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
                </>
              ) : (
                <>Начать тренировку</>
              )}
            </button>
          </div>

          {/* Habits Tracker */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold px-2">Привычки</h3>
            <div className="grid grid-cols-2 gap-3">
              <HabitCard
                title="Белок (140г)"
                icon={<Flame className="w-5 h-5" />}
                active={progress?.habit_data.protein || false}
                onClick={() => toggleHabit("protein")}
              />
              <HabitCard
                title="Креатин (5г)"
                icon={<Dumbbell className="w-5 h-5" />}
                active={progress?.habit_data.creatine || false}
                onClick={() => toggleHabit("creatine")}
              />
              <HabitCard
                title="Вода (2.6л)"
                icon={<Droplets className="w-5 h-5" />}
                active={progress?.habit_data.water || false}
                onClick={() => toggleHabit("water")}
              />
              <HabitCard
                title="10к шагов"
                icon={<Footprints className="w-5 h-5" />}
                active={progress?.habit_data.steps || false}
                onClick={() => toggleHabit("steps")}
              />
            </div>

            {/* Carnivore Mode */}
            <div
              onClick={() => isCarnivoreAvailable && toggleHabit("carnivore")}
              className={cn(
                "mt-4 p-4 rounded-2xl border flex items-center justify-between transition-all",
                isCarnivoreAvailable
                  ? progress?.habit_data.carnivore
                    ? "bg-red-950/30 border-red-500/50 cursor-pointer"
                    : "bg-zinc-900 border-white/10 cursor-pointer hover:bg-zinc-800"
                  : "bg-zinc-900/50 border-white/5 opacity-50 cursor-not-allowed",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "p-2 rounded-xl",
                    progress?.habit_data.carnivore
                      ? "bg-red-500/20 text-red-500"
                      : "bg-zinc-800 text-zinc-400",
                  )}
                >
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h4
                    className={cn(
                      "font-bold",
                      progress?.habit_data.carnivore
                        ? "text-red-400"
                        : "text-white",
                    )}
                  >
                    Carnivore Mode
                  </h4>
                  <p className="text-xs text-zinc-500">
                    {currentWorkout.id === "rest" ? "День отдыха (Только белок)" : isCarnivoreAvailable ? "Доступно" : "Доступно с 15 мая"}
                  </p>
                </div>
              </div>
              {isCarnivoreAvailable && (
                <div
                  className={cn(
                    "w-12 h-6 rounded-full p-1 transition-colors",
                    progress?.habit_data.carnivore
                      ? "bg-red-500"
                      : "bg-zinc-700",
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full bg-white transition-transform",
                      progress?.habit_data.carnivore
                        ? "translate-x-6"
                        : "translate-x-0",
                    )}
                  />
                </div>
              )}
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
        <div className="flex flex-col items-center justify-center p-3 bg-zinc-900/50 rounded-2xl border border-white/5">
          <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Параметры</span>
          <span className="text-white font-mono font-bold">180 см / 75 кг</span>
        </div>
        <div className="flex flex-col items-center justify-center p-3 bg-zinc-900/50 rounded-2xl border border-emerald-500/20">
          <span className="text-emerald-500 text-[10px] uppercase font-bold tracking-wider mb-1">Сухая масса (18% жира)</span>
          <span className="text-emerald-400 font-mono font-bold">61.5 кг</span>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-emerald-500/20 rounded-2xl p-4 grid grid-cols-1 gap-3">
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
                  <span className="text-xs text-zinc-500 italic">{ex.note}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderHistory = () => {
    const allDays = eachDayOfInterval({ start: CYCLE_START_DATE, end: TARGET_DATE });
    
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="text-center space-y-2 mt-4 mb-8">
          <h2 className="text-3xl font-black tracking-tight">ВСЕ ДНИ</h2>
          <p className="text-zinc-400 text-sm">Полный план до 1 июня. Нажмите на день для просмотра.</p>
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
              
              const isCarnivoreAvailableForDay = day >= CARNIVORE_START_DATE || WORKOUT_CYCLE[cycleIndex].id === "rest";
              const totalHabits = isCarnivoreAvailableForDay ? 5 : 4;
              const habitsCount = record ? Object.values(record.habit_data).filter(Boolean).length : 0;

              return (
                <button 
                  key={dateStr}
                  onClick={() => {
                    setCurrentDate(day);
                    setActiveTab('today');
                    window.scrollTo(0, 0);
                  }}
                  className={cn(
                    "w-full text-left border rounded-2xl p-4 flex flex-col gap-3 transition-all",
                    isCurrentDay 
                      ? "bg-zinc-900/80 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                      : isFutureDay
                        ? "bg-zinc-950/50 border-white/5 opacity-60"
                        : "bg-zinc-900/50 border-white/5 hover:bg-zinc-800/80"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-zinc-500 uppercase tracking-wider">День {dayNumber}</span>
                        <span className="text-xs font-bold text-zinc-400">•</span>
                        <span className="text-xs font-bold text-zinc-400 capitalize">{format(day, "d MMM, EEE", { locale: ru })}</span>
                      </div>
                      <p className={cn("font-bold", isFutureDay ? "text-zinc-500" : "text-white")}>
                        {workoutName}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {isCurrentDay && !record?.completed && (
                        <div className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg text-[10px] font-bold">
                          СЕГОДНЯ
                        </div>
                      )}
                      {isFutureDay && !record?.completed && (
                        <div className="bg-zinc-800 text-zinc-500 px-2 py-1 rounded-lg text-[10px] font-bold">
                          ОЖИДАЕТСЯ
                        </div>
                      )}
                      {!isFutureDay && !isCurrentDay && !record?.completed && (
                        <div className="bg-red-500/10 text-red-400 px-2 py-1 rounded-lg text-[10px] font-bold">
                          ПРОПУСК
                        </div>
                      )}
                      
                      <button 
                        onClick={(e) => toggleWorkoutCompletion(e, day, record, workoutName)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                          record?.completed 
                            ? "bg-emerald-500 border-emerald-500 text-black" 
                            : "border-zinc-600 text-transparent hover:border-emerald-500"
                        )}
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Mini habits indicator */}
                  {!isFutureDay && (
                    <div className="flex items-center gap-2 pt-3 border-t border-white/5">
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
                </button>
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
}: {
  title: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start p-4 rounded-2xl border transition-all text-left",
        active
          ? "bg-emerald-950/30 border-emerald-500/50"
          : "bg-zinc-900 border-white/10 hover:bg-zinc-800",
      )}
    >
      <div className="flex justify-between w-full mb-3">
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
        {active ? (
          <Check className="w-5 h-5 text-emerald-500" />
        ) : (
          <Circle className="w-5 h-5 text-zinc-600" />
        )}
      </div>
      <span
        className={cn(
          "font-medium text-sm",
          active ? "text-emerald-100" : "text-zinc-300",
        )}
      >
        {title}
      </span>
    </button>
  );
}
