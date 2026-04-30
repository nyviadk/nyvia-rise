import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { createMMKV } from "react-native-mmkv";
import NyviaRiseModule from "@/modules/nyvia-rise";
import { calculateNextAlarmTime } from "@/src/utils/time-helpers";

const mmkv = createMMKV({ id: "nyviarise-alarms" });

const zustandStorage: StateStorage = {
  setItem: (name, value) => mmkv.set(name, value),
  getItem: (name) => mmkv.getString(name) ?? null,
  removeItem: (name) => mmkv.remove(name),
};

export interface Alarm {
  id: string;
  time: number; // Unix timestamp for næste ringning
  isActive: boolean;
  days: number[]; // [0-6] for ugedage
  specificDate?: string | null; // Gemmes som ISO string, hvis en specifik kalenderdag er valgt
}

interface AlarmState {
  alarms: Alarm[];
  secretQrCode: string | null;
  setSecretQrCode: (code: string) => void;
  addAlarm: (alarm: Alarm) => void;
  removeAlarm: (id: string) => void;
  toggleAlarm: (id: string) => void;
  importAlarms: (importedAlarms: Alarm[]) => void;
  syncWithAndroid: () => void;
  handleAlarmDismissed: () => void;
}

export const useAlarmStore = create<AlarmState>()(
  persist(
    (set, get) => ({
      alarms: [],
      secretQrCode: null,

      setSecretQrCode: (code) => set({ secretQrCode: code }),

      addAlarm: (newAlarm) => {
        const { alarms, toggleAlarm, syncWithAndroid } = get();

        // Tjek for duplikater: Matcher time, minut, ugedage og evt. specifik dato?
        const newDate = new Date(newAlarm.time);

        const existing = alarms.find((a) => {
          const aDate = new Date(a.time);
          const sameTime =
            aDate.getHours() === newDate.getHours() &&
            aDate.getMinutes() === newDate.getMinutes();
          const sameDays =
            JSON.stringify([...a.days].sort()) ===
            JSON.stringify([...newAlarm.days].sort());
          const sameSpecific = a.specificDate === newAlarm.specificDate;
          return sameTime && sameDays && sameSpecific;
        });

        if (existing) {
          if (!existing.isActive) {
            // Findes allerede, men er slukket. Tænd den og opdater dens tid!
            set((state) => ({
              alarms: state.alarms.map((a) =>
                a.id === existing.id
                  ? { ...a, isActive: true, time: newAlarm.time }
                  : a,
              ),
            }));
            syncWithAndroid();
          }
          return; // Gør intet, hvis den allerede findes og er tændt
        }

        // Ellers opret en ny
        set((state) => ({ alarms: [...state.alarms, newAlarm] }));
        syncWithAndroid();
      },

      removeAlarm: (id) => {
        set((state) => ({ alarms: state.alarms.filter((a) => a.id !== id) }));
        get().syncWithAndroid();
      },

      toggleAlarm: (id) => {
        set((state) => ({
          alarms: state.alarms.map((a) =>
            a.id === id ? { ...a, isActive: !a.isActive } : a,
          ),
        }));
        get().syncWithAndroid();
      },

      importAlarms: (importedAlarms) => {
        set({ alarms: importedAlarms });
        get().syncWithAndroid();
      },

      // KØRER NÅR DU HAR SCANNKET KODEN
      handleAlarmDismissed: () => {
        const { alarms, toggleAlarm, syncWithAndroid } = get();

        // Finder den alarm der lige har ringet (den aktive alarm med den ældste tid)
        const activeAlarms = alarms
          .filter((a) => a.isActive)
          .sort((a, b) => a.time - b.time);

        if (activeAlarms.length > 0) {
          const ringingAlarm = activeAlarms[0];

          if (ringingAlarm.days.length > 0) {
            // GENTAGENDE ALARM: Udregn næste ugedag og skub alarmen, behold den aktiv
            const baseDate = new Date();
            baseDate.setHours(
              new Date(ringingAlarm.time).getHours(),
              new Date(ringingAlarm.time).getMinutes(),
              0,
              0,
            );

            const nextTime = calculateNextAlarmTime(
              baseDate,
              ringingAlarm.days,
            );

            set((state) => ({
              alarms: state.alarms.map((a) =>
                a.id === ringingAlarm.id ? { ...a, time: nextTime } : a,
              ),
            }));
          } else {
            // ENGANGS ALARM ELLER SPECIFIK DATO: Slå den fra
            toggleAlarm(ringingAlarm.id);
          }
          syncWithAndroid();
        }
      },

      syncWithAndroid: () => {
        const { alarms } = get();
        const now = Date.now();
        const activeFutureAlarms = alarms.filter(
          (a) => a.isActive && a.time > now,
        );

        if (activeFutureAlarms.length > 0) {
          activeFutureAlarms.sort((a, b) => a.time - b.time);
          NyviaRiseModule.scheduleAlarm(activeFutureAlarms[0].time);
        } else {
          NyviaRiseModule.scheduleAlarm(0);
        }
      },
    }),
    {
      name: "nyviarise-storage",
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.syncWithAndroid();
      },
    },
  ),
);
