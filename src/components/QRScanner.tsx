import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Text,
  Animated,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Toast from "react-native-toast-message";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useAlarmStore } from "@/src/store/useAlarmStore";

interface QRScannerProps {
  mode: "scan" | "pair";
  // Tilføjet 'force_quit' så vi kan slukke helt uden at sætte en ny snooze alarm
  onSuccess: (method: "scan" | "panic" | "force_quit") => void;
  onCancel: () => void;
}

// Custom Checkbox komponent for et lækkert, moderne look uden eksterne libraries
const CustomCheckbox = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) => (
  <Pressable
    style={styles.checkboxContainer}
    onPress={() => onChange(!checked)}
  >
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked && <Text style={styles.checkmark}>✓</Text>}
    </View>
    <ThemedText style={styles.checkboxLabel}>{label}</ThemedText>
  </Pressable>
);

export function QRScanner({ mode, onSuccess, onCancel }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // States til navngivning af ny stregkode
  const [scannedNewCode, setScannedNewCode] = useState<string | null>(null);
  const [codeName, setCodeName] = useState("");

  // States til Tap-nødstop (Force Quit)
  const [cb1, setCb1] = useState(false);
  const [cb2, setCb2] = useState(false);
  const [cb3, setCb3] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapsRequired = 15;
  const tapResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;

  // Vi forventer nu at secretQrCodes er objekter { id, code, name } i storen
  const secretQrCodes = useAlarmStore((state) => state.secretQrCodes);
  const addSecretQrCode = useAlarmStore((state) => state.addSecretQrCode);

  useEffect(() => {
    return () => {
      if (tapResetTimerRef.current) clearTimeout(tapResetTimerRef.current);
    };
  }, []);

  // Animer baren, og kør FØRST executeEmergencyStop når animationen rent faktisk er færdig (100% fyldt)
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: tapCount / tapsRequired,
      duration: 150, // Lidt blødere animation
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && tapCount >= tapsRequired) {
        executeEmergencyStop();
      }
    });
  }, [tapCount]);

  const executeEmergencyStop = () => {
    if (tapResetTimerRef.current) clearTimeout(tapResetTimerRef.current);
    setTapCount(0);
    progressAnim.setValue(0);

    setTimeout(() => {
      onSuccess("force_quit"); // Sender besked om at det var et ægte Force Quit!
    }, 0);
  };

  const handlePanicTap = () => {
    if (!cb1 || !cb2 || !cb3) {
      Toast.show({
        type: "error",
        text1: "Hov!",
        text2: "Du skal markere alle 3 bokse først.",
        position: "bottom",
      });
      return;
    }

    setTapCount((prev) => {
      const newCount = prev + 1;
      return newCount > tapsRequired ? tapsRequired : newCount;
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

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setScanned(true);

    // Tjek om koden allerede findes (håndterer både det gamle string format og det nye object format)
    const alreadyExists = secretQrCodes.some((item: any) =>
      typeof item === "string" ? item === data : item.code === data,
    );

    if (mode === "pair") {
      if (alreadyExists) {
        Toast.show({
          type: "info",
          text1: "Allerede parret",
          text2: "Denne stregkode findes allerede på din liste.",
        });
        setTimeout(() => setScanned(false), 2000);
      } else {
        // I stedet for at gemme direkte, åbner vi navngivnings-UI'en
        setScannedNewCode(data);
      }
    } else {
      if (alreadyExists) {
        onSuccess("scan");
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

  const handleSaveNewCode = () => {
    if (!codeName.trim()) {
      Toast.show({ type: "error", text1: "Giv den lige et navn først!" });
      return;
    }

    // Gemmer koden med et unikt ID, selve stregkoden, og navnet
    addSecretQrCode({
      id: Date.now().toString(),
      code: scannedNewCode!,
      name: codeName.trim(),
    });

    Toast.show({
      type: "success",
      text1: "Succes! 🔗",
      text2: `'${codeName.trim()}' er tilføjet.`,
    });
    onSuccess("scan");
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
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={requestPermission}
        >
          <Text style={styles.primaryButtonText}>Giv tilladelse</Text>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // UI State: Navngivning af ny kode
  if (scannedNewCode) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Navngiv Stregkode 🏷️
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Hvad har du lige scannet?
        </ThemedText>

        <TextInput
          style={styles.input}
          placeholder="F.eks. Badeværelse, Kaffemaskine..."
          placeholderTextColor="#666"
          value={codeName}
          onChangeText={setCodeName}
          autoFocus
        />

        <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
          <TouchableOpacity
            style={[styles.secondaryButton, { flex: 1 }]}
            onPress={() => {
              setScannedNewCode(null);
              setScanned(false);
              setCodeName("");
            }}
          >
            <Text style={styles.secondaryButtonText}>Annuller</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, { flex: 1 }]}
            onPress={handleSaveNewCode}
          >
            <Text style={styles.primaryButtonText}>Gem Kode</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const progressColor = progressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["#4CAF50", "#FF9800", "#F44336"],
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
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "ean8", "code128", "upc_a"],
          }}
        />
      </View>

      {mode === "scan" && (
        <View style={styles.emergencyContainer}>
          <View style={styles.checkboxWrapper}>
            <CustomCheckbox
              label="Jeg er vågen"
              checked={cb1}
              onChange={setCb1}
            />
            <CustomCheckbox
              label="Jeg vil force-quite appen"
              checked={cb2}
              onChange={setCb2}
            />
            <CustomCheckbox
              label="Sluk alarmen helt"
              checked={cb3}
              onChange={setCb3}
            />
          </View>

          <ThemedText style={styles.tapCounterText}>
            {tapCount > 0
              ? `Manglende tryk: ${tapsRequired - tapCount}`
              : "FORCE QUIT:"}
          </ThemedText>

          <Pressable
            style={({ pressed }) => [
              styles.emergencyButton,
              (!cb1 || !cb2 || !cb3) && styles.emergencyButtonDisabled,
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
                  opacity: 0.4,
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
        <TouchableOpacity style={{ marginTop: 30 }} onPress={onCancel}>
          <Text style={{ color: "#F44336", fontSize: 16, fontWeight: "bold" }}>
            Annuller
          </Text>
        </TouchableOpacity>
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
    backgroundColor: "#121212",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#121212",
  },
  title: {
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#aaa",
    marginBottom: 30,
    textAlign: "center",
    fontSize: 16,
  },
  warningText: {
    textAlign: "center",
    marginBottom: 20,
    color: "#fff",
    fontSize: 16,
  },

  cameraContainer: {
    width: 280,
    height: 280,
    overflow: "hidden",
    borderRadius: 20,
    marginBottom: 30,
    borderWidth: 4,
    borderColor: "#4CAF50",
    backgroundColor: "#000",
  },

  // Checkbox Styles
  checkboxWrapper: {
    width: "100%",
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    gap: 12,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#666",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#F44336",
    borderColor: "#F44336",
  },
  checkmark: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  checkboxLabel: {
    color: "#ddd",
    fontSize: 15,
  },

  emergencyContainer: {
    width: "100%",
    alignItems: "center",
    maxWidth: 350,
  },
  tapCounterText: {
    color: "#888",
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  emergencyButton: {
    backgroundColor: "#222",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#444",
    width: "100%",
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  emergencyButtonDisabled: {
    opacity: 0.5,
  },
  emergencyButtonPressed: {
    backgroundColor: "#333",
  },
  emergencyText: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
    fontSize: 18,
    zIndex: 10,
    letterSpacing: 1,
  },

  // Input og generelle knapper
  input: {
    backgroundColor: "#222",
    color: "#fff",
    width: "100%",
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#444",
  },
  primaryButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  secondaryButton: {
    backgroundColor: "#333",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
