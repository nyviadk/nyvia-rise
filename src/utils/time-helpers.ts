import {
  set,
  isBefore,
  addDays,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  getDay,
} from "date-fns";

export const calculateNextAlarmTime = (
  selectedTime: Date,
  activeDays: number[] = [],
  specificDate?: Date | null,
): number => {
  const now = new Date();

  // 1. Start med dags dato, og overskriv timer/minutter med det valgte tidspunkt
  let alarmTime = set(now, {
    hours: selectedTime.getHours(),
    minutes: selectedTime.getMinutes(),
    seconds: 0,
    milliseconds: 0,
  });

  if (specificDate) {
    // 2a. Hvis du har valgt en fast dato i kalenderen
    alarmTime = set(alarmTime, {
      year: specificDate.getFullYear(),
      month: specificDate.getMonth(),
      date: specificDate.getDate(),
    });

    // SIKKERHEDSNET: Hvis den valgte dato er i dag, men tiden er passeret,
    // skubber vi den en dag frem, så alarmen ikke går af øjeblikkeligt.
    if (isBefore(alarmTime, now)) {
      alarmTime = addDays(alarmTime, 1);
    }
  } else if (activeDays.length === 0) {
    // 2b. Engangsalarm (Hverken ugedage eller fast dato valgt)
    if (isBefore(alarmTime, now)) {
      alarmTime = addDays(alarmTime, 1);
    }
  } else {
    // 2c. Gentagende alarm (Ugedage)
    if (isBefore(alarmTime, now) || !activeDays.includes(getDay(alarmTime))) {
      alarmTime = addDays(alarmTime, 1);
      // Fortsæt med at lægge en dag til, indtil vi rammer en valgt ugedag
      while (!activeDays.includes(getDay(alarmTime))) {
        alarmTime = addDays(alarmTime, 1);
      }
    }
  }

  // getTime() genererer det korrekte Unix timestamp uanset dansk sommer/vintertid
  return alarmTime.getTime();
};

export const getTimeRemainingText = (alarmTimestamp: number): string => {
  const now = new Date();
  const target = new Date(alarmTimestamp);

  const days = differenceInDays(target, now);
  const hours = differenceInHours(target, now) % 24;
  const minutes = differenceInMinutes(target, now) % 60;

  let textParts = [];
  if (days > 0) textParts.push(`${days} dag${days > 1 ? "e" : ""}`);
  if (hours > 0) textParts.push(`${hours} time${hours > 1 ? "r" : ""}`);
  if (minutes > 0) textParts.push(`${minutes} min`);

  if (textParts.length === 0) return "under 1 minut";
  return textParts.join(", ");
};
