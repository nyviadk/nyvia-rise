import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
  AppState,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import NyviaRiseModule from "@/modules/nyvia-rise";
import { QRScanner } from "@/src/components/QRScanner";
import { Alarm, useAlarmStore } from "@/src/store/useAlarmStore";
import {
  calculateNextAlarmTime,
  getTimeRemainingText,
} from "@/src/utils/time-helpers";

export default function HomeScreen() {
  const [scannerMode, setScannerMode] = useState<"none" | "scan" | "pair">(
    "none",
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Modal og redigering state
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingAlarmId, setEditingAlarmId] = useState<string | null>(null);
  const [isFabFlow, setIsFabFlow] = useState(false);

  // Formular state
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [specificDate, setSpecificDate] = useState<Date | null>(null);
  const [pendingTime, setPendingTime] = useState<Date | null>(null);

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  const alarms = useAlarmStore((state) => state.alarms);
  const secretQrCodes = useAlarmStore((state) => state.secretQrCodes);
  const removeSecretQrCode = useAlarmStore((state) => state.removeSecretQrCode);
  const addAlarm = useAlarmStore((state) => state.addAlarm);
  const updateAlarm = useAlarmStore((state) => state.updateAlarm);
  const toggleAlarm = useAlarmStore((state) => state.toggleAlarm);
  const removeAlarm = useAlarmStore((state) => state.removeAlarm);
  const importAlarms = useAlarmStore((state) => state.importAlarms);
  const handleAlarmDismissed = useAlarmStore(
    (state) => state.handleAlarmDismissed,
  );

  useEffect(() => {
    alarms.forEach((a) => {
      if (a.id.startsWith("snooze-") && !a.isActive) {
        removeAlarm(a.id);
      }
    });
  }, [alarms]);

  useEffect(() => {
    const checkAlarmState = () => {
      const isRinging = NyviaRiseModule.isAlarmActive();
      if (isRinging) {
        setScannerMode("scan");
      }
    };

    checkAlarmState();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        checkAlarmState();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

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

  const handleFabPress = () => {
    if (secretQrCodes.length === 0) {
      Toast.show({
        type: "error",
        text1: "Mangler stregkode",
        text2: "Tilføj mindst én stregkode, før du kan sætte en alarm.",
      });
      return;
    }
    setIsFabFlow(true);
    setPendingTime(new Date());
    setShowTimePicker(true);
  };

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
      if (isFabFlow) {
        const triggerTime = calculateNextAlarmTime(selectedDate, [], null);
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        addAlarm({
          id: uniqueId,
          time: triggerTime,
          isActive: true,
          days: [],
          specificDate: null,
        });

        Toast.show({
          type: "success",
          text1: "Alarm gemt og aktiveret 🌅",
          text2: `Planlagt til om ${getTimeRemainingText(triggerTime)}`,
        });
        setIsFabFlow(false);
      } else {
        setPendingTime(selectedDate);
      }
    } else {
      setIsFabFlow(false);
    }
  };

  const openEditAlarm = (alarm: Alarm) => {
    setEditingAlarmId(alarm.id);
    setPendingTime(new Date(alarm.time));
    setSelectedDays(alarm.days || []);
    setSpecificDate(alarm.specificDate ? new Date(alarm.specificDate) : null);
    setIsEditModalVisible(true);
  };

  const handleSaveEditedAlarm = () => {
    if (!pendingTime || !editingAlarmId) return;

    const triggerTime = calculateNextAlarmTime(
      pendingTime,
      selectedDays,
      specificDate,
    );

    updateAlarm(editingAlarmId, {
      time: triggerTime,
      days: selectedDays,
      specificDate: specificDate ? specificDate.toISOString() : null,
      isActive: true,
    });

    setIsEditModalVisible(false);
    setEditingAlarmId(null);

    Toast.show({
      type: "success",
      text1: "Alarm opdateret 🌅",
      text2: `Planlagt til om ${getTimeRemainingText(triggerTime)}`,
    });
  };

  const handleToggleAlarm = (alarm: Alarm) => {
    toggleAlarm(alarm.id);

    if (!alarm.isActive) {
      // Alarmen bliver slået TIL
      Toast.show({
        type: "success",
        text1: "Alarm aktiveret ⏰",
        text2: `Planlagt til om ${getTimeRemainingText(alarm.time)}`,
      });
    } else {
      // Alarmen bliver slået FRA
      Toast.show({
        type: "info",
        text1: "Alarm slået fra 😴",
      });
    }
  };

  const handleDeleteAlarm = (id: string) => {
    removeAlarm(id);
    Toast.show({
      type: "error",
      text1: "Alarm slettet 🗑️",
    });
  };

  const stopAlarm = (method: "scan" | "panic" | "force_quit") => {
    NyviaRiseModule.stopAlarm();
    handleAlarmDismissed();

    if (method === "scan") {
      Toast.show({
        type: "success",
        text1: "Alarm slukket!",
        text2: "Godmorgen! ☀️ Scanner virkede perfekt.",
      });
    } else if (method === "panic") {
      const snoozeDate = new Date();
      snoozeDate.setSeconds(0, 0);
      snoozeDate.setMinutes(snoozeDate.getMinutes() + 2);

      addAlarm({
        id: `snooze-${Date.now()}`,
        time: snoozeDate.getTime(),
        isActive: true,
        days: [],
        specificDate: snoozeDate.toISOString(),
      });

      Toast.show({
        type: "error",
        text1: "Snooze aktiveret 🚨",
        text2: `Du slap ikke! Alarmen ringer igen kl. ${snoozeDate.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}`,
      });
    } else if (method === "force_quit") {
      Toast.show({
        type: "info",
        text1: "Alarm tvangslukket 🛑",
        text2: "Appen blev lukket ned. Ingen ny alarm sat.",
      });
    }
    setScannerMode("none");
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
      <>
        <QRScanner
          mode={scannerMode}
          onSuccess={stopAlarm}
          onCancel={() => setScannerMode("none")}
        />
        <Toast />
      </>
    );
  }

  const dayNames = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
  const displayAlarms = alarms.filter((a) => !a.id.startsWith("snooze-"));

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F9FC" }}>
      {/* Sikrer at ikoner i statusbaren er sorte/mørke */}
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.container}>
          <ThemedText type="title" style={styles.titleSpacing}>
            NyviaRise 🌅
          </ThemedText>

          <View style={styles.card}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Godkendte stregkoder
            </ThemedText>
            {secretQrCodes.length === 0 ? (
              <ThemedText style={{ color: "#F44336", marginTop: 5 }}>
                ⚠️ Ingen stregkode parret!
              </ThemedText>
            ) : (
              secretQrCodes.map((item: any) => {
                const codeString = typeof item === "string" ? item : item.code;
                const codeName =
                  typeof item === "string" ? "Ukendt lokation" : item.name;
                const idToRemove = typeof item === "string" ? item : item.id;

                return (
                  <View key={idToRemove} style={styles.codeItem}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontWeight: "bold" }}>
                        {codeName}
                      </ThemedText>
                      <ThemedText
                        style={{ fontSize: 12, color: "#666" }}
                        numberOfLines={1}
                      >
                        {codeString}
                      </ThemedText>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButtonSmall}
                      onPress={() => removeSecretQrCode(idToRemove)}
                    >
                      <ThemedText style={styles.deleteButtonText}>
                        Fjern
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 15 }]}
              onPress={() => setScannerMode("pair")}
            >
              <ThemedText style={styles.primaryButtonText}>
                + Tilføj ny stregkode
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Dine alarmer
            </ThemedText>
            {displayAlarms.length === 0 ? (
              <ThemedText style={{ color: "#999", marginTop: 5 }}>
                Ingen alarmer sat op endnu. Tryk på plusset for at starte.
              </ThemedText>
            ) : (
              displayAlarms.map((alarm) => (
                <View key={alarm.id} style={styles.alarmItem}>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => openEditAlarm(alarm)}
                    activeOpacity={0.6}
                  >
                    <ThemedText style={styles.alarmTimeText}>
                      {new Date(alarm.time).toLocaleTimeString("da-DK", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </ThemedText>
                    {alarm.specificDate ? (
                      <ThemedText style={styles.alarmSubText}>
                        Dato:{" "}
                        {new Date(alarm.specificDate).toLocaleDateString(
                          "da-DK",
                        )}
                      </ThemedText>
                    ) : alarm.days.length > 0 ? (
                      <ThemedText style={styles.alarmSubText}>
                        Gentages:{" "}
                        {alarm.days.map((d) => dayNames[d]).join(", ")}
                      </ThemedText>
                    ) : (
                      <ThemedText style={styles.alarmSubText}>
                        Engangsalarm (tryk for at tilføje dage)
                      </ThemedText>
                    )}
                  </TouchableOpacity>

                  <View style={styles.alarmActions}>
                    <Switch
                      value={alarm.isActive}
                      onValueChange={() => handleToggleAlarm(alarm)}
                      trackColor={{ false: "#ccc", true: "#4CAF50" }}
                    />
                    <TouchableOpacity
                      onPress={() => handleDeleteAlarm(alarm.id)}
                    >
                      <ThemedText style={{ fontSize: 20 }}>🗑️</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.developerSection}>
            <ThemedText style={styles.devTitle}>Udvikler værktøj</ThemedText>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={() => {
                NyviaRiseModule.testAlarm();
                setScannerMode("scan");
              }}
            >
              <ThemedText style={styles.dangerButtonText}>
                🔊 Test alarm nu
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.backupContainer}>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await Share.share({ message: JSON.stringify(alarms) });
                  } catch (e) {}
                }}
              >
                <ThemedText style={styles.textLink}>Eksportér</ThemedText>
              </TouchableOpacity>
              <ThemedText style={{ color: "#ccc" }}>|</ThemedText>
              <TouchableOpacity onPress={() => setShowImport(!showImport)}>
                <ThemedText style={styles.textLink}>Importér</ThemedText>
              </TouchableOpacity>
            </View>

            {showImport && (
              <View style={styles.importBox}>
                <TextInput
                  style={styles.input}
                  placeholder="Indsæt JSON backup her..."
                  placeholderTextColor="#999"
                  value={importText}
                  onChangeText={setImportText}
                  multiline
                />
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    try {
                      const parsed = JSON.parse(importText);
                      if (Array.isArray(parsed)) {
                        importAlarms(parsed);
                        Toast.show({
                          type: "success",
                          text1: "Alarmer importeret!",
                        });
                        setShowImport(false);
                        setImportText("");
                      }
                    } catch (e) {
                      Toast.show({ type: "error", text1: "Ugyldigt format!" });
                    }
                  }}
                >
                  <ThemedText style={styles.secondaryButtonText}>
                    Gennemfør import
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ThemedView>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={handleFabPress}
        activeOpacity={0.8}
      >
        <ThemedText style={styles.fabText}>+</ThemedText>
      </TouchableOpacity>

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
          value={pendingTime || new Date()}
          mode="time"
          display="clock"
          is24Hour={true}
          onChange={handleTimeSelected}
        />
      )}

      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle" style={styles.modalTitle}>
                Rediger alarm
              </ThemedText>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <ThemedText style={styles.closeButtonText}>Luk</ThemedText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.timeSelectArea}
              onPress={() => {
                setIsFabFlow(false);
                setShowTimePicker(true);
              }}
            >
              <ThemedText type="subtitle">
                {pendingTime
                  ? pendingTime.toLocaleTimeString("da-DK", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "--:--"}
              </ThemedText>
              <ThemedText style={{ color: "#2196F3", marginTop: 5 }}>
                Tryk for at ændre tid
              </ThemedText>
            </TouchableOpacity>

            <ThemedText style={styles.label}>
              Vælg faste dage (valgfrit)
            </ThemedText>
            <View style={styles.daysContainer}>
              {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayCircle,
                      isSelected && styles.dayCircleSelected,
                    ]}
                    onPress={() => toggleDay(day)}
                  >
                    <ThemedText
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {dayNames[day]}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ThemedText style={styles.label}>
              ...eller vælg specifik dato:
            </ThemedText>
            {specificDate ? (
              <View style={styles.dateSelectedRow}>
                <ThemedText style={styles.dateText}>
                  {specificDate.toLocaleDateString("da-DK")}
                </ThemedText>
                <TouchableOpacity onPress={() => setSpecificDate(null)}>
                  <ThemedText style={{ color: "#F44336", fontWeight: "bold" }}>
                    Ryd
                  </ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowDatePicker(true)}
              >
                <ThemedText style={styles.secondaryButtonText}>
                  🗓 Vælg i kalender
                </ThemedText>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveEditedAlarm}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.saveButtonText}>
                Gem ændringer
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, paddingBottom: 130 },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "transparent",
  },
  titleSpacing: {
    marginBottom: 20,
    marginTop: 50,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "bold",
  },
  card: {
    width: "100%",
    marginVertical: 10,
    padding: 20,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
    fontWeight: "500",
  },
  codeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  alarmItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  alarmTimeText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  alarmSubText: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
  },
  alarmActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  daysContainer: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 20,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  dayCircleSelected: {
    backgroundColor: "#4CAF50",
  },
  dayText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  dayTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  dateSelectedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 10,
  },
  dateText: {
    color: "#1976D2",
    fontWeight: "bold",
  },
  primaryButton: {
    backgroundColor: "#2196F3",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "bold", fontSize: 14 },

  secondaryButton: {
    backgroundColor: "#F0F4F8",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  secondaryButtonText: { color: "#333", fontWeight: "600", fontSize: 14 },

  saveButton: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 30,
  },
  saveButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  dangerButton: {
    backgroundColor: "#FFEBEE",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  dangerButtonText: { color: "#D32F2F", fontWeight: "bold" },

  deleteButtonSmall: {
    backgroundColor: "#FFEBEE",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  deleteButtonText: { color: "#D32F2F", fontSize: 12, fontWeight: "bold" },

  developerSection: {
    marginTop: 10,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: "#E0E0E0",
    width: "100%",
  },
  devTitle: {
    textAlign: "center",
    color: "#999",
    marginBottom: 15,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  backupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 15,
    marginTop: 20,
    marginBottom: 40,
  },
  textLink: { color: "#2196F3", fontWeight: "600" },
  importBox: {
    width: "100%",
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 30,
  },
  input: {
    backgroundColor: "#F7F9FC",
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    minHeight: 80,
    textAlignVertical: "top",
    color: "#333",
  },
  fab: {
    position: "absolute",
    right: 25,
    bottom: 80,
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  fabText: {
    fontSize: 36,
    color: "#ffffff",
    fontWeight: "300",
    marginTop: -4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    paddingBottom: Platform.OS === "ios" ? 40 : 25,
    minHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButtonText: {
    fontSize: 16,
    color: "#2196F3",
    fontWeight: "600",
  },
  timeSelectArea: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#F7F9FC",
    borderRadius: 15,
    marginBottom: 25,
  },
});
