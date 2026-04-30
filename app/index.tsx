import { useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
// Vi importerer vores lokale Kotlin-modul!
import NyviaRiseModule from "../modules/nyvia-rise";

export default function HomeScreen() {
  const [status, setStatus] = useState<string>("Ingen alarm sat");

  // Funktion til at teste alarmen
  const testAlarm = () => {
    // Sætter alarmen til om præcis 10 sekunder
    const triggerTime = Date.now() + 10 * 1000;

    // Kalder vores Kotlin kode!
    NyviaRiseModule.scheduleAlarm(triggerTime);

    setStatus("Alarm sat til om 10 sekunder... Luk evt. appen og vent!");
  };

  // Funktion til at stoppe alarmen (som senere bliver aktiveret af QR-scanneren)
  const stopAlarm = () => {
    NyviaRiseModule.stopAlarm();
    setStatus("Alarm stoppet!");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NyviaRise 🌅</Text>
      <Text style={styles.status}>{status}</Text>

      <View style={styles.buttonContainer}>
        <Button
          title="Test Alarm (10 sekunder)"
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E6F4FE",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  status: {
    fontSize: 16,
    marginBottom: 40,
    color: "#666",
    textAlign: "center",
  },
  buttonContainer: {
    marginVertical: 10,
    width: "100%",
  },
});
