import { View, type ViewProps, StyleSheet } from "react-native";

export type ThemedViewProps = ViewProps & {};

export function ThemedView({ style, ...otherProps }: ThemedViewProps) {
  return <View style={[styles.background, style]} {...otherProps} />;
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: "#F8F9FA",
  },
});
