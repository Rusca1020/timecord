import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Card, HelperText, RadioButton, Surface } from 'react-native-paper';
import { router } from 'expo-router';
import { useStore } from '@/store/useStore';
import { UserRole } from '@/types';

export default function SignupScreen() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'child' as UserRole,
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { isLoading, setUser, setIsLoading } = useStore();

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요';
    }

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setIsLoading(true);
    // 임시 회원가입 - 더미 유저 생성
    setTimeout(() => {
      setUser({
        id: 'temp-user-' + Date.now(),
        name: formData.name,
        email: formData.email,
        role: formData.role,
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        createdAt: new Date(),
      });
      setIsLoading(false);
      router.replace('/(tabs)');
    }, 500);
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
              회원가입
            </Text>

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

            {/* 이메일 입력 */}
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

            {/* 비밀번호 입력 */}
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

            {/* 비밀번호 확인 */}
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

            {/* 회원가입 버튼 */}
            <Button
              mode="contained"
              onPress={handleSignup}
              loading={isLoading}
              disabled={isLoading}
              style={styles.signupButton}
              contentStyle={styles.buttonContent}
            >
              회원가입
            </Button>

            {/* 로그인 링크 */}
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
