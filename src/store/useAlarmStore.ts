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

// NYT: Definerer stregkoder som et objekt, så vi kan gemme navnene
export interface SecretQrCode {
  id: string;
  code: string;
  name: string;
}

interface AlarmState {
  alarms: Alarm[];
  secretQrCodes: SecretQrCode[];
  addSecretQrCode: (qrCode: SecretQrCode) => void;
  removeSecretQrCode: (id: string) => void;
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
      secretQrCodes: [],

      addSecretQrCode: (newQrCode) =>
        set((state) => {
          // Undgå dubletter af selve stregkode-dataen
          if (state.secretQrCodes.some((qr) => qr.code === newQrCode.code))
            return state;
          return { secretQrCodes: [...state.secretQrCodes, newQrCode] };
        }),

      // Nu sletter vi ud fra ID'et
      removeSecretQrCode: (id) =>
        set((state) => ({
          secretQrCodes: state.secretQrCodes.filter((qr) => qr.id !== id),
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
        get().syncWithAndroid();
      },

      removeAlarm: (id) => {
        // Vi tvinger Android til at slette netop denne alarm først!
        NyviaRiseModule.cancelAlarm(id);

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

        // 1. Vi skyder med spredehagl og aflyser ALLE alarmer i Android.
        // Det sikrer, at der ikke ligger en gammel "snooze" eller deaktiveret alarm og lurer i baggrunden.
        alarms.forEach((a) => {
          NyviaRiseModule.cancelAlarm(a.id);
        });

        // 2. Vi finder den alarm, der er tættest på at ringe, og beder Android om at fokusere 100% på dén.
        if (activeFutureAlarms.length > 0) {
          activeFutureAlarms.sort((a, b) => a.time - b.time);
          const nextAlarm = activeFutureAlarms[0];

          // Giver Kotlin både det unikke ID og tidspunktet
          NyviaRiseModule.scheduleAlarm(nextAlarm.id, nextAlarm.time);
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
