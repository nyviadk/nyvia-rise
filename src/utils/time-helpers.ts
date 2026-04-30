import { set, isBefore, addDays } from "date-fns";

export const calculateNextAlarmTime = (selectedDate: Date): number => {
  const now = new Date();

  // 1. Vi tager dags dato, men overskriver timer og minutter
  // med det, du valgte i DatePickeren. Sekunder låses til 0.
  let alarmTime = set(now, {
    hours: selectedDate.getHours(),
    minutes: selectedDate.getMinutes(),
    seconds: 0,
    milliseconds: 0,
  });

  // 2. Hvis klokken allerede ER passeret i dag,
  // skubber date-fns den præcis 1 dag frem (håndterer automatisk skudår og sommertid)
  if (isBefore(alarmTime, now)) {
    alarmTime = addDays(alarmTime, 1);
  }

  // 3. getTime() konverterer den lokale tid til et universelt Unix Timestamp.
  // Dette er 110% tidszone-sikkert, når vi sender det til Kotlin!
  return alarmTime.getTime();
};
