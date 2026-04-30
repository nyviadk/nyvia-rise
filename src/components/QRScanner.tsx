import React, { useState } from "react";
import { StyleSheet, View, Pressable, Text, Button } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Toast from "react-native-toast-message"; // NYT: Importerer Toast her også!
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

  const secretQrCodes = useAlarmStore((state) => state.secretQrCodes);
  const addSecretQrCode = useAlarmStore((state) => state.addSecretQrCode);

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
      if (secretQrCodes.includes(data)) {
        Toast.show({
          type: "info",
          text1: "Allerede parret",
          text2: "Denne stregkode findes allerede på din liste.",
        });
        setTimeout(() => setScanned(false), 2000);
      } else {
        addSecretQrCode(data);
        Toast.show({
          type: "success",
          text1: "Succes! 🔗",
          text2: "Din nye kode er tilføjet.",
        });
        onSuccess();
      }
    } else {
      // Tjekker om koden findes i vores array af godkendte koder
      if (secretQrCodes.includes(data)) {
        onSuccess();
      } else {
        Toast.show({
          type: "error",
          text1: "Forkert stregkode! ❌",
          text2: "Dette er ikke en af dine parrede koder. Prøv igen.",
        });
        setTimeout(() => setScanned(false), 2000);
      }
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {mode === "pair" ? "Tilføj ny kode 🔗" : "Tid til at stå op! 🚨"}
      </ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        {mode === "pair"
          ? "Scan den kode du vil tilføje."
          : "Scan en af dine godkendte koder for at slukke."}
      </ThemedText>

      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8"] }}
        />
      </View>

      {mode === "scan" && (
        <View style={styles.emergencyContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.emergencyButton,
              pressed && styles.emergencyButtonPressed,
            ]}
            delayLongPress={5000}
            onLongPress={() => {
              Toast.show({
                type: "error",
                text1: "NØDSTOP 🚨",
                text2: "Alarmen blev tvangsslukket.",
              });
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
