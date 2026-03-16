import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useStore } from '@/store/useStore';
import { resendVerificationEmail, checkEmailVerification } from '@/services/authService';

const RESEND_COOLDOWN = 60; // 초

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const masked = local[0] + '***';
  return `${masked}@${domain}`;
}

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { pendingVerificationEmail, clearPendingVerification, initializeAuth } = useStore();
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // 쿨다운 타이머
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // 인증 완료 확인
  const handleCheckVerification = useCallback(async () => {
    setIsChecking(true);
    setMessage(null);

    const result = await checkEmailVerification();

    if (result.verified) {
      setMessage('이메일 인증이 완료되었습니다!');
      setMessageType('success');
      // 인증 완료 → initializeAuth로 세션 재로드
      await initializeAuth();
    } else {
      setMessage(result.error || '아직 이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.');
      setMessageType('error');
    }

    setIsChecking(false);
  }, [initializeAuth]);

  // 인증 메일 재전송
  const handleResend = useCallback(async () => {
    if (!pendingVerificationEmail || cooldown > 0) return;

    setIsResending(true);
    setMessage(null);

    const result = await resendVerificationEmail(pendingVerificationEmail);

    if (result.success) {
      setMessage('인증 메일을 다시 보냈습니다. 이메일을 확인해주세요.');
      setMessageType('success');
      setCooldown(RESEND_COOLDOWN);
    } else {
      setMessage(result.error || '인증 메일 재전송에 실패했습니다.');
      setMessageType('error');
    }

    setIsResending(false);
  }, [pendingVerificationEmail, cooldown]);

  // 다른 계정으로 로그인
  const handleSwitchAccount = useCallback(() => {
    clearPendingVerification();
    router.replace('/(auth)/login');
  }, [clearPendingVerification, router]);

  const email = pendingVerificationEmail || '';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        {/* 아이콘 영역 */}
        <View style={styles.iconContainer}>
          <Text style={styles.clockIcon}>🕰️</Text>
          <Text style={styles.mailIcon}>✉️</Text>
        </View>

        <Text variant="headlineSmall" style={styles.title}>
          이메일 인증 대기
        </Text>

        <Text variant="bodyLarge" style={styles.subtitle}>
          가입하신 이메일로 인증 링크를 보냈습니다.{'\n'}
          이메일을 확인해주세요.
        </Text>

        {/* 이메일 표시 */}
        <Card style={styles.emailCard}>
          <Card.Content style={styles.emailCardContent}>
            <Text variant="titleMedium" style={styles.emailText}>
              {maskEmail(email)}
            </Text>
          </Card.Content>
        </Card>

        {/* 메시지 표시 */}
        {message && (
          <View style={[styles.messageContainer, messageType === 'error' ? styles.errorContainer : styles.successContainer]}>
            <Text style={messageType === 'error' ? styles.errorText : styles.successText}>
              {message}
            </Text>
          </View>
        )}

        {/* 버튼 그룹 */}
        <View style={styles.buttonGroup}>
          <Button
            mode="contained"
            onPress={handleCheckVerification}
            loading={isChecking}
            disabled={isChecking}
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            인증 완료 확인
          </Button>

          <Button
            mode="outlined"
            onPress={handleResend}
            loading={isResending}
            disabled={isResending || cooldown > 0}
            style={styles.secondaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.secondaryButtonLabel}
          >
            {cooldown > 0
              ? `인증 메일 재전송 (${cooldown}초)`
              : '인증 메일 재전송'}
          </Button>

          <Button
            mode="text"
            onPress={handleSwitchAccount}
            style={styles.textButton}
            labelStyle={styles.textButtonLabel}
          >
            다른 계정으로 로그인
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  clockIcon: {
    fontSize: 48,
  },
  mailIcon: {
    fontSize: 48,
  },
  title: {
    color: '#3E2723',
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: '#8D6E63',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emailCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  emailCardContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emailText: {
    color: '#6B4226',
    fontWeight: '600',
  },
  messageContainer: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: '#F0D6D6',
  },
  successContainer: {
    backgroundColor: '#E8F5E9',
  },
  errorText: {
    color: '#8B3A3A',
    textAlign: 'center',
  },
  successText: {
    color: '#2E7D32',
    textAlign: 'center',
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#6B4226',
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderColor: '#6B4226',
    borderRadius: 12,
  },
  secondaryButtonLabel: {
    color: '#6B4226',
  },
  textButton: {
    marginTop: 4,
  },
  textButtonLabel: {
    color: '#8D6E63',
  },
});
