import React, { useState } from "react";
import { StyleSheet, Button, View, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { SECRET_QR_CODE } from "../code";

interface QRScannerProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function QRScanner({ onSuccess, onCancel }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Dette er den hemmelige kode, appen leder efter!
  // Senere kan du printe en QR-kode, der indeholder præcis denne tekst.

  // Venter på at systemet tjekker tilladelser
  if (!permission) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Henter kamerarettigheder...</ThemedText>
      </ThemedView>
    );
  }

  // Hvis brugeren ikke har givet tilladelse endnu
  if (!permission.granted) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={styles.warningText}>
          NyviaRise SKAL bruge kameraet for at du kan slukke alarmen!
        </ThemedText>
        <Button title="Giv tilladelse" onPress={requestPermission} />
      </ThemedView>
    );
  }

  // Håndter scanning
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setScanned(true);

    if (data === SECRET_QR_CODE) {
      onSuccess(); // Rigtig kode = Stop alarmen!
    } else {
      Alert.alert(
        "Forkert QR-kode",
        "Det der er ikke badeværelset! Prøv igen.",
      );
      // Tillad et nyt forsøg efter 2 sekunder
      setTimeout(() => setScanned(false), 2000);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Tid til at stå op! 🚨
      </ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        Scan koden på badeværelset for at slukke.
      </ThemedText>

      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"], // Vi lytter KUN efter QR koder for at spare batteri/CPU
          }}
        />
      </View>

      {/* Midlertidig knap til at lukke scanneren, mens vi udvikler */}
      <Button
        title="Annuller (Kun til test)"
        onPress={onCancel}
        color="#F44336"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#000", // Sort baggrund til scanneren ser lidt skarpere ud
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    color: "#ccc",
    marginBottom: 30,
    textAlign: "center",
  },
  warningText: {
    textAlign: "center",
    marginBottom: 20,
  },
  cameraContainer: {
    width: 300,
    height: 300,
    overflow: "hidden",
    borderRadius: 20,
    marginBottom: 40,
    borderWidth: 3,
    borderColor: "#2196F3",
  },
});
