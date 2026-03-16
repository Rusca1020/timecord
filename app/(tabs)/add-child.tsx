import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Card, HelperText, Portal, Dialog } from 'react-native-paper';
import { router } from 'expo-router';
import { useStore } from '@/store/useStore';
import { lookupByEmail, linkParentChild } from '@/services/connectionService';
import * as authService from '@/services/authService';
import { ChildInfo } from '@/types';

export default function AddChildScreen() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successDialogVisible, setSuccessDialogVisible] = useState(false);
  const [linkedChildName, setLinkedChildName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLinkChild = async () => {
    if (!validate()) return;
    if (!user) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      // 1. 이메일로 프로필 조회
      const lookupResult = await lookupByEmail(email);
      if (!lookupResult.success || !lookupResult.profile) {
        setErrorMessage(lookupResult.error || '해당 이메일로 가입된 계정을 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }

      const profile = lookupResult.profile;

      // 2. 자녀 계정인지 확인
      if (profile.role !== 'child') {
        setErrorMessage('해당 계정은 자녀 계정이 아닙니다. 자녀 계정의 이메일을 입력해주세요.');
        setIsLoading(false);
        return;
      }

      // 3. 이미 연결된 자녀인지 확인
      const existingChildren = user.children || [];
      if (existingChildren.some(c => c.id === profile.id)) {
        setErrorMessage('이미 연결된 자녀입니다.');
        setIsLoading(false);
        return;
      }

      // 4. parent_child_links 테이블에 링크 생성
      const linkResult = await linkParentChild(user.id, profile.id);
      if (!linkResult.success) {
        setErrorMessage(linkResult.error || '연결에 실패했습니다.');
        setIsLoading(false);
        return;
      }

      // 5. 부모 metadata의 children 업데이트
      const newChild: ChildInfo = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
      };

      const updatedChildren = [...existingChildren, newChild];
      const updateResult = await authService.updateUserMetadata({
        children: updatedChildren,
      });

      if (updateResult.success && updateResult.user) {
        setUser(updateResult.user);
      } else {
        // metadata 업데이트 실패해도 링크는 생성됨 → 로컬 상태만 업데이트
        setUser({ ...user, children: updatedChildren });
      }

      setLinkedChildName(profile.name);
      setSuccessDialogVisible(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '연결에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessDialogVisible(false);
    router.back();
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
              자녀 연결
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              자녀가 이미 가입한 이메일을 입력하면{'\n'}자동으로 연결됩니다.
            </Text>

            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* 이메일 입력 */}
            <TextInput
              label="자녀 이메일"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrors((prev) => ({ ...prev, email: undefined }));
                setErrorMessage('');
              }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              error={!!errors.email}
              style={styles.input}
              left={<TextInput.Icon icon="email" />}
            />
            {errors.email && (
              <HelperText type="error">{errors.email}</HelperText>
            )}

            <Text variant="bodySmall" style={styles.hint}>
              자녀가 회원가입할 때 사용한 이메일을 입력해주세요.
            </Text>

            {/* 연결 버튼 */}
            <Button
              mode="contained"
              onPress={handleLinkChild}
              loading={isLoading}
              disabled={isLoading}
              style={styles.createButton}
              contentStyle={styles.buttonContent}
            >
              자녀 연결
            </Button>

            {/* 취소 버튼 */}
            <Button
              mode="outlined"
              onPress={() => router.back()}
              style={styles.cancelButton}
            >
              취소
            </Button>
          </Card.Content>
        </Card>

        {/* 성공 다이얼로그 */}
        <Portal>
          <Dialog visible={successDialogVisible} onDismiss={handleSuccessClose}>
            <Dialog.Title>연결 완료</Dialog.Title>
            <Dialog.Content>
              <Text>{linkedChildName} 자녀와 성공적으로 연결되었습니다.</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={handleSuccessClose}>확인</Button>
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
    padding: 16,
  },
  card: {
    borderRadius: 16,
  },
  cardTitle: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  description: {
    textAlign: 'center',
    color: '#8D6E63',
    marginBottom: 24,
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
  hint: {
    color: '#A1887F',
    marginTop: 8,
    marginBottom: 16,
  },
  createButton: {
    marginTop: 8,
    backgroundColor: '#6B4226',
  },
  cancelButton: {
    marginTop: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
