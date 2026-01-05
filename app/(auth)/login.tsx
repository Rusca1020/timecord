import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Card, HelperText, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import { useStore } from '@/store/useStore';
import { handleGoogleSignIn, getAuthErrorMessage } from '@/services/authService';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

// Google OAuth 설정 (placeholder - 실제 값으로 교체 필요)
const GOOGLE_WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { signIn, signInWithGoogle, isLoading, authError, setAuthError } = useStore();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  // Google OAuth 응답 처리
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token, access_token } = response.params;
      handleGoogleSignIn(id_token, access_token)
        .then(({ user, isNewUser }) => {
          if (isNewUser) {
            // 새 Google 사용자 - 회원가입으로 리다이렉트
            router.replace('/(auth)/signup?provider=google');
          } else {
            signInWithGoogle(user);
          }
        })
        .catch((error) => {
          if (error.message === 'NEEDS_ROLE_SELECTION') {
            router.replace('/(auth)/signup?provider=google');
          } else {
            setAuthError(getAuthErrorMessage(error.code || ''));
          }
        });
    }
  }, [response]);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    if (!password) {
      newErrors.password = '비밀번호를 입력해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      await signIn(email, password);
    } catch (error) {
      // 에러는 store에서 처리됨
    }
  };

  const handleGoogleLogin = () => {
    promptAsync();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 로고/타이틀 영역 */}
        <View style={styles.headerContainer}>
          <Text variant="displaySmall" style={styles.appName}>
            Timecord
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            시간을 관리하고 보상받기
          </Text>
        </View>

        {/* 로그인 카드 */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              로그인
            </Text>

            {/* 에러 메시지 */}
            {authError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}

            {/* 이메일 입력 */}
            <TextInput
              label="이메일"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrors((prev) => ({ ...prev, email: undefined }));
                setAuthError(null);
              }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={!!errors.email}
              style={styles.input}
              left={<TextInput.Icon icon="email" />}
            />
            {errors.email && (
              <HelperText type="error" visible={!!errors.email}>
                {errors.email}
              </HelperText>
            )}

            {/* 비밀번호 입력 */}
            <TextInput
              label="비밀번호"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrors((prev) => ({ ...prev, password: undefined }));
                setAuthError(null);
              }}
              mode="outlined"
              secureTextEntry={!showPassword}
              error={!!errors.password}
              style={styles.input}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />
            {errors.password && (
              <HelperText type="error" visible={!!errors.password}>
                {errors.password}
              </HelperText>
            )}

            {/* 로그인 버튼 */}
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginButton}
              contentStyle={styles.buttonContent}
            >
              로그인
            </Button>

            {/* 구분선 */}
            <View style={styles.dividerContainer}>
              <Divider style={styles.divider} />
              <Text style={styles.dividerText}>또는</Text>
              <Divider style={styles.divider} />
            </View>

            {/* Google 로그인 버튼 */}
            <Button
              mode="outlined"
              onPress={handleGoogleLogin}
              disabled={!request || isLoading}
              style={styles.googleButton}
              contentStyle={styles.buttonContent}
              icon={({ size }) => (
                <FontAwesome name="google" size={size} color="#DB4437" />
              )}
            >
              Google로 로그인
            </Button>

            {/* 회원가입 링크 */}
            <View style={styles.signupContainer}>
              <Text variant="bodyMedium" style={styles.signupText}>
                계정이 없으신가요?
              </Text>
              <Button
                mode="text"
                onPress={() => router.push('/(auth)/signup')}
                compact
              >
                회원가입
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appName: {
    color: '#6366F1',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#64748B',
    marginTop: 8,
  },
  card: {
    borderRadius: 16,
  },
  cardTitle: {
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
  input: {
    marginBottom: 8,
  },
  loginButton: {
    marginTop: 16,
    backgroundColor: '#6366F1',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#94A3B8',
  },
  googleButton: {
    borderColor: '#E2E8F0',
  },
  signupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  signupText: {
    color: '#64748B',
  },
});
