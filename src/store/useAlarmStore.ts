import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { createMMKV } from "react-native-mmkv";

// 1. Initialiser MMKV
const mmkv = createMMKV({
  id: "nyviarise-alarms",
});

// 2. Byg broen mellem Zustand og MMKV
const zustandStorage: StateStorage = {
  setItem: (name, value) => {
    return mmkv.set(name, value);
  },
  getItem: (name) => {
    const value = mmkv.getString(name);
    return value ?? null;
  },
  removeItem: (name) => {
    return mmkv.remove(name);
  },
};

// 3. Vores Alarm Datamodel
export interface Alarm {
  id: string;
  time: number;
  isActive: boolean;
  days?: number[];
}

// 4. Definer hvad vores Store skal kunne
interface AlarmState {
  alarms: Alarm[];
  addAlarm: (alarm: Alarm) => void;
  removeAlarm: (id: string) => void;
  toggleAlarm: (id: string) => void;
}

// 5. Opret selve Zustand Store med persist middleware
export const useAlarmStore = create<AlarmState>()(
  persist(
    (set) => ({
      alarms: [],

      addAlarm: (alarm) =>
        set((state) => ({ alarms: [...state.alarms, alarm] })),

      removeAlarm: (id) =>
        set((state) => ({ alarms: state.alarms.filter((a) => a.id !== id) })),

      toggleAlarm: (id) =>
        set((state) => ({
          alarms: state.alarms.map((a) =>
            a.id === id ? { ...a, isActive: !a.isActive } : a,
          ),
        })),
    }),
    {
      name: "nyviarise-storage", // Navnet på nøglen i MMKV
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
