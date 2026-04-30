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
  time: number;
  isActive: boolean;
  days: number[];
  specificDate?: string | null;
}

interface AlarmState {
  alarms: Alarm[];
  secretQrCodes: string[]; // NYT: Array af godkendte koder
  addSecretQrCode: (code: string) => void;
  removeSecretQrCode: (code: string) => void;
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
      secretQrCodes: [], // Starter som en tom liste

      addSecretQrCode: (code) =>
        set((state) => {
          // Tilføj kun hvis den ikke allerede findes
          if (state.secretQrCodes.includes(code)) return state;
          return { secretQrCodes: [...state.secretQrCodes, code] };
        }),

      removeSecretQrCode: (code) =>
        set((state) => ({
          secretQrCodes: state.secretQrCodes.filter((c) => c !== code),
        })),

      addAlarm: (newAlarm) => {
        const { alarms, syncWithAndroid } = get();
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
            set((state) => ({
              alarms: state.alarms.map((a) =>
                a.id === existing.id
                  ? { ...a, isActive: true, time: newAlarm.time }
                  : a,
              ),
            }));
            syncWithAndroid();
          }
          return;
        }

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

      handleAlarmDismissed: () => {
        const { alarms, toggleAlarm, syncWithAndroid } = get();
        const activeAlarms = alarms
          .filter((a) => a.isActive)
          .sort((a, b) => a.time - b.time);

        if (activeAlarms.length > 0) {
          const ringingAlarm = activeAlarms[0];

          if (ringingAlarm.days.length > 0) {
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
