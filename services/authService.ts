import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, UserRole, SignupFormData, AuthProvider } from '@/types';

// Firestore에 사용자 문서 생성
const createUserDocument = async (
  firebaseUser: FirebaseUser,
  role: UserRole,
  name: string,
  authProvider: AuthProvider
): Promise<User> => {
  const userData: User = {
    id: firebaseUser.uid,
    name: name,
    email: firebaseUser.email || '',
    role: role,
    balance: 0,
    totalEarned: 0,
    totalSpent: 0,
    createdAt: new Date(),
    ...(role === 'parent' ? { childrenIds: [] } : {}),
  };

  await setDoc(doc(db, 'users', firebaseUser.uid), {
    ...userData,
    authProvider,
    createdAt: userData.createdAt.toISOString(),
  });

  return userData;
};

// Firestore에서 사용자 문서 조회
export const getUserDocument = async (uid: string): Promise<User | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        createdAt: new Date(data.createdAt),
      } as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting user document:', error);
    return null;
  }
};

// 이메일/비밀번호 회원가입
export const signUpWithEmail = async (
  formData: SignupFormData
): Promise<User> => {
  const { email, password, name, role } = formData;

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = await createUserDocument(
    userCredential.user,
    role,
    name,
    'email'
  );

  return user;
};

// 이메일/비밀번호 로그인
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = await getUserDocument(userCredential.user.uid);
  if (!user) {
    throw new Error('사용자 정보를 찾을 수 없습니다');
  }

  return user;
};

// Google 로그인 처리
export const handleGoogleSignIn = async (
  idToken: string,
  accessToken?: string,
  role?: UserRole,
  name?: string
): Promise<{ user: User; isNewUser: boolean }> => {
  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  const userCredential = await signInWithCredential(auth, credential);

  // 기존 사용자 확인
  let user = await getUserDocument(userCredential.user.uid);
  let isNewUser = false;

  if (!user) {
    // 새 사용자 - role이 필요함
    if (!role) {
      throw new Error('NEEDS_ROLE_SELECTION');
    }

    user = await createUserDocument(
      userCredential.user,
      role,
      name || userCredential.user.displayName || '사용자',
      'google'
    );
    isNewUser = true;
  }

  return { user, isNewUser };
};

// 로그아웃
export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

// Auth 상태 변경 리스너
export const subscribeToAuthChanges = (
  callback: (user: FirebaseUser | null) => void
) => {
  return onAuthStateChanged(auth, callback);
};

// Firebase 에러 메시지 한글화
export const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return '이미 사용 중인 이메일입니다';
    case 'auth/invalid-email':
      return '올바른 이메일 형식이 아닙니다';
    case 'auth/weak-password':
      return '비밀번호는 6자 이상이어야 합니다';
    case 'auth/user-not-found':
      return '등록되지 않은 이메일입니다';
    case 'auth/wrong-password':
      return '비밀번호가 올바르지 않습니다';
    case 'auth/invalid-credential':
      return '이메일 또는 비밀번호가 올바르지 않습니다';
    case 'auth/too-many-requests':
      return '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요';
    case 'auth/network-request-failed':
      return '네트워크 연결을 확인해주세요';
    default:
      return '오류가 발생했습니다. 다시 시도해주세요';
  }
};
