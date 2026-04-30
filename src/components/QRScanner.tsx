import React, { useState, useRef, useEffect } from "react";
import { StyleSheet, View, Pressable, Text, Button } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Toast from "react-native-toast-message";
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

  // States til nødstop
  const [isHolding, setIsHolding] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(8);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const secretQrCodes = useAlarmStore((state) => state.secretQrCodes);
  const addSecretQrCode = useAlarmStore((state) => state.addSecretQrCode);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handlePressIn = () => {
    setIsHolding(true);
    setSecondsLeft(8);

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => {
            Toast.show({
              type: "error",
              text1: "NØDSTOP 🚨",
              text2: "Alarmen blev tvangsslukket.",
            });
            onSuccess();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handlePressOut = () => {
    setIsHolding(false);
    setSecondsLeft(8);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

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
      {/* STOR NEDTÆLLING I TOPPEN */}
      <View style={styles.countdownContainer}>
        {isHolding ? (
          <Text style={styles.countdownNumber}>{secondsLeft}</Text>
        ) : (
          <Text style={styles.countdownPlaceholder}> </Text>
        )}
      </View>

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
            style={[
              styles.emergencyButton,
              isHolding && styles.emergencyButtonPressed,
            ]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <Text style={styles.emergencyText}>
              {isHolding ? "SLIP FOR AT ANNULLERE" : "Hold inde for nødstop"}
            </Text>
          </Pressable>
        </View>
      )}

      {mode === "pair" && (
        <View style={{ marginTop: 20 }}>
          <Button title="Annuller" color="#888" onPress={onCancel} />
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
  // NYT: Styling til den store nedtælling
  countdownContainer: {
    height: 100, // Reserverer plads så indholdet ikke hopper
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  countdownNumber: {
    fontSize: 80,
    fontWeight: "bold",
    color: "#F44336", // Rød farve der signalerer alarm/stop
  },
  countdownPlaceholder: {
    fontSize: 80, // Samme størrelse for at holde layoutet stabilt
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
    paddingVertical: 20, // Gjort knappen lidt større
    paddingHorizontal: 40,
    borderRadius: 15, // Blødere kanter
    borderWidth: 2,
    borderColor: "#555",
    minWidth: 250,
  },
  emergencyButtonPressed: {
    backgroundColor: "#D32F2F", // Mørkerød når den holdes nede
    borderColor: "#FF5252",
  },
  emergencyText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16, // Lidt større tekst
  },
});
