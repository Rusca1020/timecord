import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Card, HelperText, RadioButton, Surface } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store/useStore';
import { handleGoogleSignIn, getAuthErrorMessage } from '@/services/authService';
import { UserRole, SignupFormData } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

// Google OAuth 설정 (placeholder - 실제 값으로 교체 필요)
const GOOGLE_WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';

export default function SignupScreen() {
  const { provider } = useLocalSearchParams<{ provider?: string }>();
  const isGoogleFlow = provider === 'google';

  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    email: '',
    password: '',
    role: 'child',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signUp, signInWithGoogle, isLoading, authError, setAuthError } = useStore();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  // Google OAuth 응답 처리
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token, access_token } = response.params;
      handleGoogleSignIn(id_token, access_token, formData.role, formData.name)
        .then(({ user }) => {
          signInWithGoogle(user);
        })
        .catch((error) => {
          setAuthError(getAuthErrorMessage(error.code || ''));
        });
    }
  }, [response]);

  const updateField = (field: keyof SignupFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setAuthError(null);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요';
    }

    if (!isGoogleFlow) {
      if (!formData.email) {
        newErrors.email = '이메일을 입력해주세요';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = '올바른 이메일 형식이 아닙니다';
      }

      if (!formData.password) {
        newErrors.password = '비밀번호를 입력해주세요';
      } else if (formData.password.length < 6) {
        newErrors.password = '비밀번호는 6자 이상이어야 합니다';
      }

      if (formData.password !== confirmPassword) {
        newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    if (isGoogleFlow) {
      // Google flow 계속
      promptAsync();
    } else {
      try {
        await signUp(formData);
      } catch (error) {
        // 에러는 store에서 처리됨
      }
    }
  };

  const handleGoogleSignup = () => {
    if (!formData.name.trim()) {
      setErrors({ name: '이름을 입력해주세요' });
      return;
    }
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
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              {isGoogleFlow ? '계정 유형 선택' : '회원가입'}
            </Text>

            {/* 에러 메시지 */}
            {authError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}

            {/* 계정 유형 선택 */}
            <Text variant="titleMedium" style={styles.sectionTitle}>
              계정 유형
            </Text>
            <View style={styles.roleContainer}>
              <Surface
                style={[
                  styles.roleCard,
                  formData.role === 'child' && styles.roleCardSelected,
                ]}
              >
                <RadioButton.Item
                  label="자녀 계정"
                  value="child"
                  status={formData.role === 'child' ? 'checked' : 'unchecked'}
                  onPress={() => updateField('role', 'child')}
                  labelStyle={styles.roleLabel}
                />
                <Text style={styles.roleDescription}>
                  시간을 벌고 쓰는 계정입니다
                </Text>
              </Surface>

              <Surface
                style={[
                  styles.roleCard,
                  formData.role === 'parent' && styles.roleCardSelected,
                ]}
              >
                <RadioButton.Item
                  label="부모 계정"
                  value="parent"
                  status={formData.role === 'parent' ? 'checked' : 'unchecked'}
                  onPress={() => updateField('role', 'parent')}
                  labelStyle={styles.roleLabel}
                />
                <Text style={styles.roleDescription}>
                  자녀 활동을 승인하고 관리합니다
                </Text>
              </Surface>
            </View>

            {/* 이름 입력 */}
            <TextInput
              label="이름"
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              mode="outlined"
              error={!!errors.name}
              style={styles.input}
              left={<TextInput.Icon icon="account" />}
            />
            {errors.name && (
              <HelperText type="error">{errors.name}</HelperText>
            )}

            {/* 이메일/비밀번호 입력 (Google flow가 아닌 경우) */}
            {!isGoogleFlow && (
              <>
                <TextInput
                  label="이메일"
                  value={formData.email}
                  onChangeText={(text) => updateField('email', text)}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={!!errors.email}
                  style={styles.input}
                  left={<TextInput.Icon icon="email" />}
                />
                {errors.email && (
                  <HelperText type="error">{errors.email}</HelperText>
                )}

                <TextInput
                  label="비밀번호"
                  value={formData.password}
                  onChangeText={(text) => updateField('password', text)}
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
                  <HelperText type="error">{errors.password}</HelperText>
                )}

                <TextInput
                  label="비밀번호 확인"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  error={!!errors.confirmPassword}
                  style={styles.input}
                  left={<TextInput.Icon icon="lock-check" />}
                />
                {errors.confirmPassword && (
                  <HelperText type="error">{errors.confirmPassword}</HelperText>
                )}
              </>
            )}

            {/* 회원가입 버튼 */}
            <Button
              mode="contained"
              onPress={handleSignup}
              loading={isLoading}
              disabled={isLoading}
              style={styles.signupButton}
              contentStyle={styles.buttonContent}
            >
              {isGoogleFlow ? 'Google로 계속하기' : '회원가입'}
            </Button>

            {/* Google 회원가입 버튼 (Google flow가 아닌 경우) */}
            {!isGoogleFlow && (
              <>
                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>또는</Text>
                  <View style={styles.divider} />
                </View>

                <Button
                  mode="outlined"
                  onPress={handleGoogleSignup}
                  disabled={!request || isLoading}
                  style={styles.googleButton}
                  contentStyle={styles.buttonContent}
                  icon={({ size }) => (
                    <FontAwesome name="google" size={size} color="#DB4437" />
                  )}
                >
                  Google로 회원가입
                </Button>
              </>
            )}

            {/* 로그인 링크 */}
            {!isGoogleFlow && (
              <View style={styles.loginContainer}>
                <Text variant="bodyMedium" style={styles.loginText}>
                  이미 계정이 있으신가요?
                </Text>
                <Button
                  mode="text"
                  onPress={() => router.push('/(auth)/login')}
                  compact
                >
                  로그인
                </Button>
              </View>
            )}
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
    padding: 16,
    paddingTop: 8,
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
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  roleContainer: {
    gap: 12,
    marginBottom: 24,
  },
  roleCard: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  roleLabel: {
    fontWeight: '600',
  },
  roleDescription: {
    color: '#64748B',
    fontSize: 12,
    marginLeft: 52,
    marginTop: -8,
    marginBottom: 8,
  },
  input: {
    marginBottom: 8,
  },
  signupButton: {
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
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#94A3B8',
  },
  googleButton: {
    borderColor: '#E2E8F0',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    color: '#64748B',
  },
});
