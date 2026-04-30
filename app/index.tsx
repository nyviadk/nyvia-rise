import { useState } from "react";
import { View, Button, StyleSheet, Switch } from "react-native";
import NyviaRiseModule from "../modules/nyvia-rise";
import { useAlarmStore } from "@/src/store/useAlarmStore";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";

export default function HomeScreen() {
  const [status, setStatus] = useState<string>("Ingen test i gang");

  // Hent alarmer og actions direkte fra Zustand - super rent!
  const alarms = useAlarmStore((state) => state.alarms);
  const addAlarm = useAlarmStore((state) => state.addAlarm);
  const toggleAlarm = useAlarmStore((state) => state.toggleAlarm);

  const testAlarm = () => {
    const triggerTime = Date.now() + 10 * 1000;
    NyviaRiseModule.scheduleAlarm(triggerTime);
    setStatus("Alarm sat til om 10 sekunder... Luk evt. appen og vent!");

    // Test: Tilføj den til vores lokale MMKV lager
    addAlarm({
      id: Date.now().toString(),
      time: triggerTime,
      isActive: true,
    });
  };

  const stopAlarm = () => {
    NyviaRiseModule.stopAlarm();
    setStatus("Alarm stoppet!");
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.titleSpacing}>
        NyviaRise 🌅
      </ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.status}>
        {status}
      </ThemedText>

      {/* Visning af gemte alarmer direkte fra MMKV */}
      <View style={styles.alarmsList}>
        <ThemedText type="subtitle">Dine Alarmer ({alarms.length}):</ThemedText>
        {alarms.map((alarm) => (
          <View key={alarm.id} style={styles.alarmItem}>
            <ThemedText>
              {new Date(alarm.time).toLocaleTimeString("da-DK", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </ThemedText>
            <Switch
              value={alarm.isActive}
              onValueChange={() => toggleAlarm(alarm.id)}
            />
          </View>
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Test Alarm (10 sek. + Gem)"
          onPress={testAlarm}
          color="#2196F3"
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button
          title="NØDSTOP / QR KODE SIMULERING"
          onPress={stopAlarm}
          color="#F44336"
        />
      </View>
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
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  alarmItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
});
