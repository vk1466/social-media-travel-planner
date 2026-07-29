import Ionicons from "@expo/vector-icons/Ionicons";
import { useSSO, useSignIn } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button, ErrorBanner } from "@/src/components/ui";
import { clerkEnabled } from "@/src/config";
import { colors, radius, shadow, spacing } from "@/src/theme";

type IconName = keyof typeof Ionicons.glyphMap;

function IconField({
  icon,
  ...props
}: { icon: IconName } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <TextInput
        style={styles.fieldInput}
        placeholderTextColor={colors.muted}
        {...props}
      />
    </View>
  );
}

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

function clerkErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "errors" in err) {
    const first = (err as { errors?: { longMessage?: string; message?: string }[] }).errors?.[0];
    return first?.longMessage || first?.message || "Sign-in failed";
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Sign-in failed";
}

function ClerkSignInForm() {
  useWarmUpBrowser();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const onGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { createdSessionId, setActive: setActiveSession, signIn: oauthSignIn } =
        await startSSOFlow({
          strategy: "oauth_google",
          redirectUrl: Linking.createURL("/"),
        });

      if (createdSessionId && setActiveSession) {
        await setActiveSession({ session: createdSessionId });
        return;
      }

      if (oauthSignIn?.status === "complete" && oauthSignIn.createdSessionId && setActiveSession) {
        await setActiveSession({ session: oauthSignIn.createdSessionId });
        return;
      }

      setError("Google sign-in did not finish. Try again, or check Google is enabled in Clerk.");
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const onPasswordSignIn = async () => {
    if (!isLoaded || !signIn) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await signIn.create({
        identifier: emailAddress.trim(),
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        return;
      }

      const emailCodeFactor = result.supportedFirstFactors?.find(
        (factor) => factor.strategy === "email_code",
      );
      if (
        (result.status === "needs_first_factor" || result.status === "needs_second_factor") &&
        emailCodeFactor &&
        "emailAddressId" in emailCodeFactor
      ) {
        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: emailCodeFactor.emailAddressId,
        });
        setPendingVerification(true);
        setError(null);
        return;
      }

      setError(
        "This account needs Google sign-in (or email verification). Use Continue with Google above.",
      );
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onVerifyCode = async () => {
    if (!isLoaded || !signIn) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: verificationCode.trim(),
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        return;
      }
      setError("Verification incomplete. Try Continue with Google instead.");
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <View style={styles.logoMark}>
          <Ionicons name="airplane" size={26} color="#fff" />
        </View>
        <Text style={styles.brand}>Travel Planner</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Same Clerk account as the web app — Google works best.</Text>
        {error ? <ErrorBanner message={error} /> : null}

        <Button
          label="Continue with Google"
          icon="logo-google"
          loading={googleLoading}
          onPress={() => void onGoogleSignIn()}
          style={{ marginBottom: spacing.md }}
        />

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or email</Text>
          <View style={styles.divider} />
        </View>

        {pendingVerification ? (
          <>
            <Text style={styles.hint}>Enter the verification code sent to your email.</Text>
            <IconField
              icon="keypad-outline"
              keyboardType="number-pad"
              placeholder="Verification code"
              value={verificationCode}
              onChangeText={setVerificationCode}
            />
            <Button
              label="Verify and sign in"
              icon="checkmark-circle-outline"
              loading={loading}
              onPress={() => void onVerifyCode()}
            />
          </>
        ) : (
          <>
            <IconField
              icon="mail-outline"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email"
              value={emailAddress}
              onChangeText={setEmailAddress}
            />
            <IconField
              icon="lock-closed-outline"
              secureTextEntry
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
            />
            <Button
              label="Sign in with email"
              icon="mail-outline"
              variant="secondary"
              loading={loading}
              onPress={() => void onPasswordSignIn()}
            />
          </>
        )}

        <Text style={styles.footer}>
          If you signed up with Google on the web, use Continue with Google here — password sign-in
          will not work for those accounts.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function SignInScreen() {
  if (!clerkEnabled) {
    return <Redirect href="/(app)/(tabs)/posts" />;
  }
  return <ClerkSignInForm />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.brand,
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow(3),
  },
  logoMark: {
    height: 56,
    width: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  brand: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: spacing.lg,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: spacing.md,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  hint: {
    color: colors.muted,
    marginBottom: spacing.sm,
    fontSize: 14,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.bg,
  },
  fieldInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.ink,
  },
  footer: {
    marginTop: spacing.md,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
