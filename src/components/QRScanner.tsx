import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Text,
  Button,
  Animated,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Toast from "react-native-toast-message";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useAlarmStore } from "@/src/store/useAlarmStore";

interface QRScannerProps {
  mode: "scan" | "pair";
  // Nu fortæller vi forælderen præcis HVORDAN vi lukkede!
  onSuccess: (method: "scan" | "panic") => void;
  onCancel: () => void;
}

export function QRScanner({ mode, onSuccess, onCancel }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // States til Tap-nødstop
  const [tapCount, setTapCount] = useState(0);
  const tapsRequired = 15; // Antal tryk krævet
  const tapResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;

  const secretQrCodes = useAlarmStore((state) => state.secretQrCodes);
  const addSecretQrCode = useAlarmStore((state) => state.addSecretQrCode);

  useEffect(() => {
    return () => {
      if (tapResetTimerRef.current) clearTimeout(tapResetTimerRef.current);
    };
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: tapCount / tapsRequired,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [tapCount]);

  const executeEmergencyStop = () => {
    if (tapResetTimerRef.current) clearTimeout(tapResetTimerRef.current);
    setTapCount(0);
    progressAnim.setValue(0);

    setTimeout(() => {
      onSuccess("panic"); // Sender besked om at det var nødstop
    }, 0);
  };

  const handlePanicTap = () => {
    setTapCount((prev) => {
      const newCount = prev + 1;

      if (newCount >= tapsRequired) {
        executeEmergencyStop();
        return 0;
      }
      return newCount;
    });

    if (tapResetTimerRef.current) {
      clearTimeout(tapResetTimerRef.current);
    }

    tapResetTimerRef.current = setTimeout(() => {
      setTapCount(0);
      Toast.show({
        type: "info",
        text1: "For langsom!",
        text2: "Du skal tappe uafbrudt.",
        visibilityTime: 1500,
        position: "bottom",
      });
    }, 1000);
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
        onSuccess("scan");
      }
    } else {
      if (secretQrCodes.includes(data)) {
        onSuccess("scan"); // Sender besked om at det var en RIGTIG slukning!
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

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const progressColor = progressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["#FFC107", "#FF9800", "#F44336"],
  });

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {mode === "pair" ? "Tilføj ny kode 🔗" : "Tid til at stå op! 🚨"}
      </ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        {mode === "pair"
          ? "Scan den kode du vil tilføje."
          : "Scan en godkendt kode, ELLER brug nødstop."}
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
          <ThemedText style={{ color: "#888", marginBottom: 10 }}>
            {tapCount > 0
              ? `Manglende tryk: ${tapsRequired - tapCount}`
              : "NØDSTOP (GIVER SNOOZE):"}
          </ThemedText>

          <Pressable
            style={({ pressed }) => [
              styles.emergencyButton,
              pressed && styles.emergencyButtonPressed,
            ]}
            onPress={handlePanicTap}
          >
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: progressColor,
                  width: progressWidth,
                  borderRadius: 15,
                  opacity: 0.3,
                },
              ]}
            />

            <Text style={styles.emergencyText}>
              {tapCount > 0 ? "BLIV VED!" : `TAP HURTIGT ${tapsRequired} GANGE`}
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
  title: { color: "#fff", marginBottom: 10, textAlign: "center", fontSize: 28 },
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
  emergencyContainer: {
    marginTop: 10,
    width: "100%",
    alignItems: "center",
  },
  emergencyButton: {
    backgroundColor: "#222",
    paddingVertical: 25,
    paddingHorizontal: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#444",
    width: "80%",
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  emergencyButtonPressed: {
    backgroundColor: "#333",
  },
  emergencyText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 18,
    zIndex: 10,
  },
});
