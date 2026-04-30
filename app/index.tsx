import React, { useEffect, useState } from "react";
import {
  View,
  Button,
  StyleSheet,
  Switch,
  Platform,
  PermissionsAndroid,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import NyviaRiseModule from "@/modules/nyvia-rise";
import { useAlarmStore } from "@/src/store/useAlarmStore";
import { calculateNextAlarmTime } from "@/src/utils/time-helpers";
import { QRScanner } from "@/src/components/QRScanner";

export default function HomeScreen() {
  const [showScanner, setShowScanner] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [status, setStatus] = useState<string>("Klar til at stå op?");

  const alarms = useAlarmStore((state) => state.alarms);
  const addAlarm = useAlarmStore((state) => state.addAlarm);
  const toggleAlarm = useAlarmStore((state) => state.toggleAlarm);

  useEffect(() => {
    const checkPermissions = async () => {
      if (Platform.OS === "android" && Platform.Version >= 33) {
        // Android 13+ kræver eksplicit tilladelse til notifikationer (som vores alarm-service bruger)
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            "Tilladelse mangler!",
            "NyviaRise har brug for notifikationstilladelse for at kunne vække dig ordentligt. Slå det til i telefonens indstillinger.",
          );
        }
      }
    };

    checkPermissions();
  }, []);

  // Når du har valgt en tid i pop-up'en
  const handleTimeSelected = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false); // Luk pop-up'en

    if (event.type === "set" && selectedDate) {
      // 1. Beregn præcist timestamp
      const triggerTime = calculateNextAlarmTime(selectedDate);

      // 2. Skyd den ind i Androids native AlarmManager (Kotlin)
      NyviaRiseModule.scheduleAlarm(triggerTime);

      // 3. Gem den i vores Zustand/MMKV hukommelse
      addAlarm({
        id: Date.now().toString(),
        time: triggerTime,
        isActive: true,
      });

      setStatus(
        `Alarm sat til kl. ${selectedDate.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}`,
      );
    }
  };

  const stopAlarm = () => {
    NyviaRiseModule.stopAlarm();
    setStatus("Godmorgen! Alarmen er stoppet.");
  };

  // Vis scanneren hvis vi er i "vågne-mode"
  if (showScanner) {
    return (
      <QRScanner
        onSuccess={() => {
          stopAlarm();
          setShowScanner(false);
        }}
        onCancel={() => setShowScanner(false)}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.titleSpacing}>
        NyviaRise 🌅
      </ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.status}>
        {status}
      </ThemedText>

      <View style={styles.alarmsList}>
        <ThemedText type="subtitle">Dine Alarmer:</ThemedText>
        {alarms.map((alarm) => (
          <View key={alarm.id} style={styles.alarmItem}>
            <ThemedText type="title">
              {new Date(alarm.time).toLocaleTimeString("da-DK", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </ThemedText>
            <Switch
              value={alarm.isActive}
              onValueChange={() => {
                // Her skal vi også håndtere at slette/tilføje fra Kotlin modulet,
                // når du tænder og slukker for en alarm. Det kan vi tage i et senere trin!
                toggleAlarm(alarm.id);
              }}
            />
          </View>
        ))}
        {alarms.length === 0 && (
          <ThemedText style={{ marginTop: 10, color: "#999" }}>
            Ingen alarmer endnu.
          </ThemedText>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="+ TILFØJ NY ALARM"
          onPress={() => setShowTimePicker(true)}
          color="#4CAF50"
        />
      </View>

      <View style={[styles.buttonContainer, { marginTop: 40 }]}>
        <Button
          title="QR KODE SIMULERING (Sluk Alarm)"
          onPress={() => setShowScanner(true)}
          color="#F44336"
        />
      </View>

      {/* Selve den usynlige time picker, der popper op */}
      {showTimePicker && (
        <DateTimePicker
          value={new Date()} // Starter på dags dato/tid
          mode="time" // Vi vil kun vælge tid, ikke dato
          display="spinner" // Det klassiske "hjul" at scrolle på
          is24Hour={true} // Dansk 24-timers format
          onChange={handleTimeSelected}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  titleSpacing: { marginBottom: 10 },
  status: { marginBottom: 30, textAlign: "center", color: "#666" },
  buttonContainer: { marginVertical: 10, width: "100%" },
  alarmsList: {
    width: "100%",
    marginVertical: 20,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 15,
    elevation: 2,
  },
  alarmItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
});
