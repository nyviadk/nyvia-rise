import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { createMMKV } from "react-native-mmkv";
import NyviaRiseModule from "@/modules/nyvia-rise"; // Husk broen til Kotlin!

// 1. Initialiser MMKV
const mmkv = createMMKV({
  id: "nyviarise-alarms",
});

// 2. Byg broen mellem Zustand og MMKV
const zustandStorage: StateStorage = {
  setItem: (name, value) => mmkv.set(name, value),
  getItem: (name) => mmkv.getString(name) ?? null,
  removeItem: (name) => mmkv.remove(name),
};

export interface Alarm {
  id: string;
  time: number; // Unix timestamp
  isActive: boolean;
}

interface AlarmState {
  alarms: Alarm[];
  addAlarm: (alarm: Alarm) => void;
  removeAlarm: (id: string) => void;
  toggleAlarm: (id: string) => void;
  syncWithAndroid: () => void;
}

export const useAlarmStore = create<AlarmState>()(
  persist(
    (set, get) => ({
      alarms: [],

      addAlarm: (alarm) => {
        set((state) => ({ alarms: [...state.alarms, alarm] }));
        get().syncWithAndroid(); // Opdater Android
      },

      removeAlarm: (id) => {
        set((state) => ({ alarms: state.alarms.filter((a) => a.id !== id) }));
        get().syncWithAndroid(); // Opdater Android
      },

      toggleAlarm: (id) => {
        set((state) => ({
          alarms: state.alarms.map((a) =>
            a.id === id ? { ...a, isActive: !a.isActive } : a,
          ),
        }));
        get().syncWithAndroid(); // Opdater Android
      },

      // Hjernen: Finder den næste aktive alarm og sender den til Kotlin
      syncWithAndroid: () => {
        const { alarms } = get();

        // Find alle aktive alarmer, der ligger ude i fremtiden
        const now = Date.now();
        const activeFutureAlarms = alarms.filter(
          (a) => a.isActive && a.time > now,
        );

        if (activeFutureAlarms.length > 0) {
          // Sorter dem, så vi finder den, der ringer først
          activeFutureAlarms.sort((a, b) => a.time - b.time);
          const nextAlarm = activeFutureAlarms[0];

          // Send timestamp (tidszone sikkert!) til Kotlin
          NyviaRiseModule.scheduleAlarm(nextAlarm.time);
          console.log(
            "Android opdateret: Næste alarm ringer",
            new Date(nextAlarm.time),
          );
        } else {
          // Hvis der ingen aktive alarmer er, sender vi bare 0 til Kotlin.
          // (Dette kræver en lille justering i vores Kotlin kode senere, så den sletter alarmen, hvis time == 0)
          NyviaRiseModule.scheduleAlarm(0);
          console.log("Ingen aktive alarmer - Android sat på pause.");
        }
      },
    }),
    {
      name: "nyviarise-storage",
      storage: createJSONStorage(() => zustandStorage),
      // Vi bruger onRehydrateStorage til at sikre, at appen automatisk
      // gen-synkroniserer med Android, når appen starter op og henter fra MMKV.
      onRehydrateStorage: () => (state) => {
        if (state) state.syncWithAndroid();
      },
    },
  ),
);
