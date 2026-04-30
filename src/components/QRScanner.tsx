import React, { useState } from "react";
import { StyleSheet, View, Alert, Pressable, Text, Button } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useAlarmStore } from "@/src/store/useAlarmStore";

interface QRScannerProps {
  mode: "scan" | "pair";
  onSuccess: () => void;
  onCancel: () => void;
}

export function QRScanner({ mode, onSuccess, onCancel }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const secretQrCode = useAlarmStore((state) => state.secretQrCode);
  const setSecretQrCode = useAlarmStore((state) => state.setSecretQrCode);

  if (!permission)
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Henter kamera...</ThemedText>
      </ThemedView>
    );
  if (!permission.granted) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={styles.warningText}>
          Kamera kræves for at slukke alarmen!
        </ThemedText>
        <Button title="Giv tilladelse" onPress={requestPermission} />
      </ThemedView>
    );
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setScanned(true);

    if (mode === "pair") {
      setSecretQrCode(data);
      Alert.alert("Succes!", "Din nye kode er gemt.");
      onSuccess();
    } else {
      if (data === secretQrCode) {
        onSuccess();
      } else {
        Alert.alert(
          "Forkert stregkode!",
          "Det er ikke den rigtige kode. Prøv igen.",
        );
        setTimeout(() => setScanned(false), 2000);
      }
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {mode === "pair" ? "Par ny kode 🔗" : "Tid til at stå op! 🚨"}
      </ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        {mode === "pair"
          ? "Scan den kode du vil bruge fremover."
          : "Scan koden på badeværelset for at slukke."}
      </ThemedText>

      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8"] }}
        />
      </View>

      <Button title="Annuller (Kun test)" onPress={onCancel} color="#888" />

      {mode === "scan" && (
        <View style={styles.emergencyContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.emergencyButton,
              pressed && styles.emergencyButtonPressed,
            ]}
            delayLongPress={10000}
            onLongPress={() => {
              Alert.alert("NØDSTOP", "Alarmen blev tvangsslukket.");
              onSuccess();
            }}
          >
            <Text style={styles.emergencyText}>
              Hold inde i 5 sek. for nødstop
            </Text>
          </Pressable>
        </View>
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
    backgroundColor: "#000",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: { color: "#fff", marginBottom: 10, textAlign: "center" },
  subtitle: { color: "#ccc", marginBottom: 30, textAlign: "center" },
  warningText: { textAlign: "center", marginBottom: 20 },
  cameraContainer: {
    width: 300,
    height: 300,
    overflow: "hidden",
    borderRadius: 20,
    marginBottom: 40,
    borderWidth: 3,
    borderColor: "#2196F3",
  },
  emergencyContainer: { marginTop: 40 },
  emergencyButton: {
    backgroundColor: "#333",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#555",
  },
  emergencyButtonPressed: { backgroundColor: "#F44336" },
  emergencyText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
});
