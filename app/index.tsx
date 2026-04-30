import React, { useState, useEffect } from "react";
import {
  View,
  Button,
  StyleSheet,
  Switch,
  Alert,
  Platform,
  PermissionsAndroid,
  Share,
  TextInput,
  ScrollView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import NyviaRiseModule from "@/modules/nyvia-rise";
import { useAlarmStore } from "@/src/store/useAlarmStore";
import {
  calculateNextAlarmTime,
  getTimeRemainingText,
} from "@/src/utils/time-helpers";
import { QRScanner } from "@/src/components/QRScanner";

export default function HomeScreen() {
  const [scannerMode, setScannerMode] = useState<"none" | "scan" | "pair">(
    "none",
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [specificDate, setSpecificDate] = useState<Date | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  const alarms = useAlarmStore((state) => state.alarms);
  const secretQrCodes = useAlarmStore((state) => state.secretQrCodes);
  const removeSecretQrCode = useAlarmStore((state) => state.removeSecretQrCode);
  const addAlarm = useAlarmStore((state) => state.addAlarm);
  const toggleAlarm = useAlarmStore((state) => state.toggleAlarm);
  const removeAlarm = useAlarmStore((state) => state.removeAlarm);
  const importAlarms = useAlarmStore((state) => state.importAlarms);
  const handleAlarmDismissed = useAlarmStore(
    (state) => state.handleAlarmDismissed,
  );

  useEffect(() => {
    const checkPermissions = async () => {
      if (Platform.OS === "android" && Platform.Version >= 33) {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      }
    };
    checkPermissions();
  }, []);

  const handleDateSelected = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === "set" && selectedDate) {
      setSpecificDate(selectedDate);
      setSelectedDays([]);
    }
  };

  const handleTimeSelected = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (event.type === "set" && selectedDate) {
      if (secretQrCodes.length === 0) {
        Alert.alert(
          "Hov!",
          "Du skal tilføje mindst én stregkode, før du kan sætte en alarm.",
        );
        return;
      }

      const triggerTime = calculateNextAlarmTime(
        selectedDate,
        selectedDays,
        specificDate,
      );

      addAlarm({
        id: Date.now().toString(),
        time: triggerTime,
        isActive: true,
        days: selectedDays,
        specificDate: specificDate ? specificDate.toISOString() : null,
      });

      Alert.alert(
        "Alarm gemt 🌅",
        `Planlagt til om ${getTimeRemainingText(triggerTime)}`,
      );

      setSelectedDays([]);
      setSpecificDate(null);
    }
  };

  const stopAlarm = () => {
    NyviaRiseModule.stopAlarm();
    handleAlarmDismissed();
    setScannerMode("none");
  };

  const handleExportBackup = async () => {
    try {
      await Share.share({ message: JSON.stringify(alarms) });
    } catch (error) {
      Alert.alert("Fejl", "Kunne ikke eksportere backup.");
    }
  };

  const handleImportBackup = () => {
    try {
      const parsed = JSON.parse(importText);
      if (Array.isArray(parsed)) {
        importAlarms(parsed);
        Alert.alert("Succes", "Alarmer importeret!");
        setShowImport(false);
        setImportText("");
      } else {
        Alert.alert("Fejl", "Ugyldigt backup format.");
      }
    } catch (e) {
      Alert.alert("Fejl", "Kunne ikke læse data.");
    }
  };

  const toggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex]);
      setSpecificDate(null);
    }
  };

  if (scannerMode !== "none") {
    return (
      <QRScanner
        mode={scannerMode}
        onSuccess={stopAlarm}
        onCancel={() => setScannerMode("none")}
      />
    );
  }

  const dayNames = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.titleSpacing}>
          NyviaRise 🌅
        </ThemedText>

        {/* -- START: HÅNDTERING AF KODER -- */}
        <View style={styles.card}>
          <ThemedText type="subtitle">
            Godkendte Koder ({secretQrCodes.length})
          </ThemedText>
          {secretQrCodes.length === 0 ? (
            <ThemedText style={{ color: "red", marginTop: 10 }}>
              ⚠️ Ingen stregkode parret!
            </ThemedText>
          ) : (
            secretQrCodes.map((code) => (
              <View key={code} style={styles.codeItem}>
                <ThemedText style={{ flex: 1 }} numberOfLines={1}>
                  *{code.slice(-6)}
                </ThemedText>
                <Button
                  title="Fjern"
                  color="#F44336"
                  onPress={() => removeSecretQrCode(code)}
                />
              </View>
            ))
          )}
          <View style={{ marginTop: 10 }}>
            <Button
              title="+ TILFØJ NY KODE"
              onPress={() => setScannerMode("pair")}
              color="#2196F3"
            />
          </View>
        </View>
        {/* -- SLUT: HÅNDTERING AF KODER -- */}

        <View style={styles.card}>
          <ThemedText type="subtitle">Dine Alarmer:</ThemedText>
          {alarms.map((alarm) => (
            <View key={alarm.id} style={styles.alarmItem}>
              <View>
                <ThemedText type="title">
                  {new Date(alarm.time).toLocaleTimeString("da-DK", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </ThemedText>

                {alarm.specificDate ? (
                  <ThemedText style={{ fontSize: 12, color: "#2196F3" }}>
                    Dato:{" "}
                    {new Date(alarm.specificDate).toLocaleDateString("da-DK")}
                  </ThemedText>
                ) : alarm.days.length > 0 ? (
                  <ThemedText style={{ fontSize: 12, color: "#666" }}>
                    Gentages: {alarm.days.map((d) => dayNames[d]).join(", ")}
                  </ThemedText>
                ) : (
                  <ThemedText style={{ fontSize: 12, color: "#666" }}>
                    Engangsalarm
                  </ThemedText>
                )}
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 15 }}
              >
                <Switch
                  value={alarm.isActive}
                  onValueChange={() => toggleAlarm(alarm.id)}
                />
                <Button
                  title="Slet"
                  color="#F44336"
                  onPress={() => removeAlarm(alarm.id)}
                />
              </View>
            </View>
          ))}
          {alarms.length === 0 && (
            <ThemedText style={{ marginTop: 10, color: "#999" }}>
              Ingen alarmer sat op.
            </ThemedText>
          )}
        </View>

        <ThemedText style={{ marginTop: 20, marginBottom: 10 }}>
          1. Vælg dage (Valgfrit):
        </ThemedText>
        <View style={styles.daysContainer}>
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <Button
              key={day}
              title={dayNames[day]}
              color={selectedDays.includes(day) ? "#4CAF50" : "#ccc"}
              onPress={() => toggleDay(day)}
            />
          ))}
        </View>

        <View
          style={{ marginVertical: 10, width: "100%", alignItems: "center" }}
        >
          <ThemedText style={{ marginBottom: 10 }}>
            ...eller vælg en specifik kalenderdato:
          </ThemedText>
          {specificDate ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <ThemedText style={{ color: "#2196F3", fontWeight: "bold" }}>
                {specificDate.toLocaleDateString("da-DK")}
              </ThemedText>
              <Button
                title="Ryd"
                color="#F44336"
                onPress={() => setSpecificDate(null)}
              />
            </View>
          ) : (
            <Button
              title="Åbn Kalender"
              color="#888"
              onPress={() => setShowDatePicker(true)}
            />
          )}
        </View>

        <View style={[styles.buttonContainer, { marginTop: 20 }]}>
          <Button
            title="2. VÆLG TID & GEM ALARM"
            onPress={() => setShowTimePicker(true)}
            color="#4CAF50"
          />
        </View>

        <View style={[styles.buttonContainer, { marginTop: 40 }]}>
          <Button
            title="🚨 TEST QR SCANNER"
            onPress={() => setScannerMode("scan")}
            color="#FF9800"
          />
        </View>

        <View style={styles.backupContainer}>
          <Button title="Eksportér" onPress={handleExportBackup} color="#888" />
          <Button
            title="Importér"
            onPress={() => setShowImport(!showImport)}
            color="#888"
          />
        </View>

        {showImport && (
          <View style={styles.importBox}>
            <TextInput
              style={styles.input}
              placeholder="Indsæt backup..."
              value={importText}
              onChangeText={setImportText}
              multiline
            />
            <Button title="Gennemfør Import" onPress={handleImportBackup} />
          </View>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={specificDate || new Date()}
            mode="date"
            display="default"
            onChange={handleDateSelected}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={new Date()}
            mode="time"
            display="spinner"
            is24Hour={true}
            onChange={handleTimeSelected}
          />
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1 },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  titleSpacing: { marginBottom: 10, marginTop: 40 },
  buttonContainer: { marginVertical: 5, width: "100%" },
  card: {
    width: "100%",
    marginVertical: 10,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 15,
    elevation: 2,
  },
  codeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  alarmItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  daysContainer: {
    flexDirection: "row",
    gap: 5,
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 15,
  },
  backupContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 50,
    marginBottom: 20,
  },
  importBox: {
    width: "100%",
    padding: 10,
    backgroundColor: "#eee",
    borderRadius: 10,
  },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    minHeight: 60,
  },
});
