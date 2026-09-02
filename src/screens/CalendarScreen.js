import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import { getAllRecords } from '../utils/storage';
import { toDateKey, getDurationMs, formatDurationTimer } from '../utils/dateUtils';
import { colors } from '../theme/colors';

LocaleConfig.locales['kr'] = {
  monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  monthNamesShort: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort: ['일','월','화','수','목','금','토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'kr';

export default function CalendarScreen({ navigation }) {
  const [records, setRecords] = useState({});
  const [dailyTotals, setDailyTotals] = useState({});

  const load = useCallback(async () => {
    const all = await getAllRecords();
    setRecords(all);
    const totals = {};
    Object.keys(all).forEach((dateKey) => {
      const sum = (all[dateKey] || []).reduce((acc, r) => {
        if (!r.clockOut) return acc;
        return acc + getDurationMs(r.clockIn, r.clockOut);
      }, 0);
      totals[dateKey] = sum;
    });
    setDailyTotals(totals);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDayPress = (day) => {
    const dateKey = day.dateString;
    if (records[dateKey] && records[dateKey].length > 0) {
      navigation.navigate('DayDetail', { dateKey });
    }
  };

  const todayKey = toDateKey(new Date());

  // 날짜 칸에 '숫자 + 총 근무시간'을 함께 렌더링하는 커스텀 컴포넌트
  const renderDay = ({ date, state }) => {
    if (!date) return <View style={styles.dayWrap} />;
    const dateKey = date.dateString;
    const totalMs = dailyTotals[dateKey];
    const hasRecord = !!totalMs;
    const isToday = dateKey === todayKey;
    const isDisabled = state === 'disabled';

    return (
      <TouchableOpacity
        style={styles.dayWrap}
        onPress={() => handleDayPress(date)}
        disabled={!hasRecord}
        activeOpacity={hasRecord ? 0.6 : 1}
      >
        <View style={[styles.dayNumberWrap, isToday && styles.dayNumberWrapToday]}>
          <Text
            style={[
              styles.dayNumber,
              isDisabled && styles.dayNumberDisabled,
              isToday && styles.dayNumberToday,
            ]}
          >
            {date.day}
          </Text>
        </View>
        {hasRecord ? (
          <Text style={styles.dayTotalText} numberOfLines={1}>
            {formatDurationTimer(totalMs)}
          </Text>
        ) : (
          <View style={styles.dayTotalPlaceholder} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Calendar
        renderHeader={(date) => (
          <Text style={styles.headerTitle}>{`${date.getFullYear()}년 ${date.getMonth() + 1}월`}</Text>
        )}
        dayComponent={renderDay}
        onDayPress={handleDayPress}
        theme={{
          textMonthFontWeight: '700',
          textMonthFontSize: 18,
          arrowColor: colors.primary,
          todayTextColor: colors.primary,
        }}
        style={styles.calendar}
      />
      <View style={styles.legend}>
        <Text style={styles.legendText}>날짜를 탭하면 상세 근무 기록을 확인·수정할 수 있어요</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  calendar: { paddingBottom: 8 },
  headerTitle: { fontWeight: '600', fontSize: 18 },
  dayWrap: { width: 42, height: 54, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 },
  dayNumberWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayNumberWrapToday: { backgroundColor: colors.primary + '22' },
  dayNumber: { fontSize: 15, color: colors.text },
  dayNumberDisabled: { color: '#C6C9D0' },
  dayNumberToday: { color: colors.primary, fontWeight: '700' },
  dayTotalText: { marginTop: 3, fontSize: 10, color: colors.primary, fontWeight: '600' },
  dayTotalPlaceholder: { marginTop: 3, height: 12 },
  legend: { paddingHorizontal: 20, paddingVertical: 12 },
  legendText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
});
