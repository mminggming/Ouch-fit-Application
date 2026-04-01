import { Tabs } from 'expo-router';
import React from 'react';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#C00000',
        tabBarInactiveTintColor: '#000',
        tabBarStyle: {
          backgroundColor: '#fff',
          height: 70,
          borderTopWidth: 0,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontFamily: 'ProductSans-Bold',
          fontSize: 12,
          marginBottom: 6,
        },
      }}
    >


      <Tabs.Screen
        name="calendar/index"
        options={{
          title: 'Planner',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="insight/index"
        options={{
          title: 'Insight',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wardrobe/list"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stylingHub/index"
        options={{
          title: 'Style',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'color-wand' : 'color-wand-outline'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' :'person-outline'} size={26} color={color} />
          ),
        }}
      />

      {/* ❌ */}
      <Tabs.Screen
        name="wardrobe/add"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="calendar/add"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="packing/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="packing/add"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="packing/[packingId]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="insight/sort"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="preset/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="preset/[presetId]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="preset/add"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="stackstyle/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="mixmatch/index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
