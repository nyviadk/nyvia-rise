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
  selectedDate: Date,
  activeDays: number[] = [],
): number => {
  const now = new Date();

  let alarmTime = set(now, {
    hours: selectedDate.getHours(),
    minutes: selectedDate.getMinutes(),
    seconds: 0,
    milliseconds: 0,
  });

  if (activeDays.length === 0) {
    // Standard: Hvis ingen dage er valgt, skub til i morgen hvis tiden er gået i dag
    if (isBefore(alarmTime, now)) {
      alarmTime = addDays(alarmTime, 1);
    }
  } else {
    // Ugedage: Find den næste dag, der er aktiv
    if (isBefore(alarmTime, now)) {
      alarmTime = addDays(alarmTime, 1);
    }
    // Løb fremad i kalenderen indtil vi rammer en valgt ugedag (0 = Søndag, 1 = Mandag osv.)
    while (!activeDays.includes(getDay(alarmTime))) {
      alarmTime = addDays(alarmTime, 1);
    }
  }

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
