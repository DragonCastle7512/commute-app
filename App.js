import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import DayDetailScreen from './src/screens/DayDetailScreen';
import { colors } from './src/theme/colors';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerTitleStyle: { color: colors.text, fontWeight: '700' },
            headerTintColor: colors.primary,
          }}
        >
          {/* 첫 진입 화면: 출퇴근 버튼이 바로 보임 */}
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: '출퇴근' }} />
          {/* 상단 오른쪽 달력 아이콘으로 진입, 뒤로가기로 Home 복귀 */}
          <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: '근무 기록' }} />
          {/* 날짜 탭 시 상세 기록 확인/수정/삭제 */}
          <Stack.Screen name="DayDetail" component={DayDetailScreen} options={{ title: '상세 기록' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
