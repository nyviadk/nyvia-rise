import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { createMMKV } from "react-native-mmkv";
import NyviaRiseModule from "@/modules/nyvia-rise";

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
  days: number[]; // [1,2,3,4,5] for hverdage. Tomt = engangsalarm.
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
}

export const useAlarmStore = create<AlarmState>()(
  persist(
    (set, get) => ({
      alarms: [],
      secretQrCode: null,

      setSecretQrCode: (code) => set({ secretQrCode: code }),

      addAlarm: (alarm) => {
        set((state) => ({ alarms: [...state.alarms, alarm] }));
        get().syncWithAndroid();
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
