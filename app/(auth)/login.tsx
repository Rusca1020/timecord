import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TextInput, Button, Text, Card, HelperText, Portal, Dialog } from 'react-native-paper';
import { router } from 'expo-router';
import { useStore } from '@/store/useStore';
import { resetPassword } from '@/services/authService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const [resetVisible, setResetVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const { isLoading, authError, signIn } = useStore();

  const handleResetPassword = async () => {
    const trimmed = resetEmail.trim();
    if (!trimmed || !/\S+@\S+\.\S+/.test(trimmed)) {
      Alert.alert('오류', '올바른 이메일을 입력해주세요.');
      return;
    }
    setResetLoading(true);
    const result = await resetPassword(trimmed);
    setResetLoading(false);
    setResetVisible(false);
    if (result.success) {
      Alert.alert('이메일 전송 완료', '비밀번호 재설정 링크가 이메일로 전송되었습니다. 이메일을 확인해주세요.');
    } else {
      Alert.alert('오류', result.error || '이메일 전송에 실패했습니다.');
    }
  };

  const openResetDialog = () => {
    setResetEmail(email);
    setResetVisible(true);
  };

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

    await signIn(email, password);
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

            {/* 에러 메시지 표시 */}
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

            <View style={styles.forgotContainer}>
              <Button mode="text" compact onPress={openResetDialog} labelStyle={styles.forgotText}>
                비밀번호를 잊으셨나요?
              </Button>
            </View>

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

        {/* 비밀번호 재설정 다이얼로그 */}
        <Portal>
          <Dialog visible={resetVisible} onDismiss={() => setResetVisible(false)}>
            <Dialog.Title>비밀번호 재설정</Dialog.Title>
            <Dialog.Content>
              <Text style={{ marginBottom: 12, color: '#8D6E63' }}>
                가입 시 사용한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
              </Text>
              <TextInput
                label="이메일"
                value={resetEmail}
                onChangeText={setResetEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                dense
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setResetVisible(false)} disabled={resetLoading}>취소</Button>
              <Button onPress={handleResetPassword} loading={resetLoading} disabled={resetLoading}>전송</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    color: '#6B4226',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#8D6E63',
    marginTop: 8,
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#FFFDF7',
  },
  cardTitle: {
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
    color: '#3E2723',
  },
  errorContainer: {
    backgroundColor: '#F0D6D6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#8B3A3A',
    textAlign: 'center',
  },
  input: {
    marginBottom: 8,
  },
  loginButton: {
    marginTop: 16,
    backgroundColor: '#6B4226',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  signupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  signupText: {
    color: '#8D6E63',
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  forgotText: {
    color: '#6B4226',
    fontSize: 13,
  },
});
