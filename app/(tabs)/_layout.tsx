import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { useStore } from '@/store/useStore';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const user = useStore((state) => state.user);
  const isParent = user?.role === 'parent';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: '#6366F1',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          headerTitle: 'Timecord',
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
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
