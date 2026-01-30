import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@/providers/AuthProvider";
import Colors from "@/constants/Colors";
import { showError } from "@/lib/toast";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  // Always use dark theme for login to match branding
  const colors = Colors.dark;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor ingresa tu email y contraseña");
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error: any) {
      showError(error.message || "Verifica tus credenciales e intenta de nuevo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logoText}>NEOS</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            RUNNING & FUNCTIONAL TEAM
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.backgroundSecondary,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.backgroundSecondary,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Contraseña"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.tint },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.footer, { color: colors.textSecondary }]}>
          ¿No tenés cuenta? Contacta a tu coach para recibir una invitación.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoText: {
    fontSize: 56,
    fontWeight: "300",
    color: "#fff",
    letterSpacing: 12,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "500",
  },
  form: {
    gap: 16,
  },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    textAlign: "center",
    marginTop: 32,
    fontSize: 14,
    lineHeight: 20,
  },
});
