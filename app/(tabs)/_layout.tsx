import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { useStore } from '@/store/useStore';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: 2 }} {...props} />;
}

export default function TabLayout() {
  const user = useStore((state) => state.user);
  const isParent = user?.role === 'parent';
  const unreadNotificationCount = useStore((state) => state.unreadNotificationCount);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6B4226',
        tabBarInactiveTintColor: '#A1887F',
        tabBarStyle: {
          backgroundColor: '#FFFDF7',
          borderTopWidth: 1,
          borderTopColor: '#D7CCC8',
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: '#6B4226',
        },
        headerTintColor: '#FFF8E1',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          headerTitle: () => (
            <View style={headerStyles.container}>
              <FontAwesome name="clock-o" size={22} color="#FFF8E1" style={headerStyles.icon} />
              <Text style={headerStyles.title}>Timecord</Text>
            </View>
          ),
        }}
      />
      {/* 자녀 전용: 기록 탭 */}
      <Tabs.Screen
        name="record"
        options={{
          title: '기록',
          tabBarIcon: ({ color }) => <TabBarIcon name="plus-circle" color={color} />,
          href: isParent ? null : '/record',
        }}
      />
      {/* 부모 전용: 승인 탭 */}
      <Tabs.Screen
        name="approve"
        options={{
          title: '승인',
          tabBarIcon: ({ color }) => <TabBarIcon name="check-circle" color={color} />,
          href: isParent ? '/approve' : null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '내역',
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: '통계',
          tabBarIcon: ({ color }) => <TabBarIcon name="bar-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '알림',
          tabBarIcon: ({ color }) => <TabBarIcon name="bell" color={color} />,
          tabBarBadge: unreadNotificationCount > 0 ? unreadNotificationCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#8B3A3A', fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
      {/* 숨겨진 화면: 자녀 추가 */}
      <Tabs.Screen
        name="add-child"
        options={{
          title: '자녀 추가',
          href: null,
        }}
      />
      {/* 숨겨진 화면: 교환 관리 (부모용) */}
      <Tabs.Screen
        name="exchange"
        options={{
          title: '교환 관리',
          href: null,
        }}
      />
      {/* 숨겨진 화면: 규칙 보기 */}
      <Tabs.Screen
        name="rules"
        options={{
          title: '규칙 보기',
          href: null,
        }}
      />
      {/* 숨겨진 화면: 알림 설정 */}
      <Tabs.Screen
        name="notification-settings"
        options={{
          title: '알림 설정',
          href: null,
        }}
      />
    </Tabs>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  title: {
    color: '#FFF8E1',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
