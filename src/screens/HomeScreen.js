import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getCurrentSession,
  setCurrentSession,
  clearCurrentSession,
  addRecord,
  generateId,
} from '../utils/storage';
import { toDateKey, formatTime, formatDuration, getDurationMs } from '../utils/dateUtils';
import { colors } from '../theme/colors';

export default function HomeScreen({ navigation }) {
  const [session, setSession] = useState(null); // { clockIn: ISOString } | null
  const [summary, setSummary] = useState(null); // {clockIn, clockOut, durationMs}
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  // 앱 재진입/화면 포커스 시 진행 중인 세션 복원
  const loadSession = useCallback(async () => {
    const s = await getCurrentSession();
    setSession(s);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSession();
    }, [loadSession])
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('Calendar')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="calendar-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // 출근 중일 때 경과 시간을 주기적으로 갱신
  useEffect(() => {
    if (session) {
      const tick = () => {
        const inD = new Date(session.clockIn);
        const outD = new Date();
        inD.setSeconds(0, 0);
        outD.setSeconds(0, 0);
        setElapsed(outD.getTime() - inD.getTime());
      }
      tick();
      intervalRef.current = setInterval(tick, 2 * 1000);
    } else {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session]);

  const handleClockIn = async () => {
    const now = new Date();
    const newSession = { clockIn: now.toISOString() };
    await setCurrentSession(newSession);
    setSession(newSession);
  };

  const handleClockOut = async () => {
    if (!session) return;
    const now = new Date();
    const dateKey = toDateKey(session.clockIn);
    const record = { id: generateId(), clockIn: session.clockIn, clockOut: now.toISOString() };
    await addRecord(dateKey, record);
    await clearCurrentSession();
    setSummary({ clockIn: session.clockIn, clockOut: now.toISOString() }); // session은 아직 유지
  };

  const confirmSummary = () => {
    setSummary(null);
    setSession(null); // 여기서 출근하기 버튼으로 전환
  };

  if (loading) {
    return <SafeAreaView style={styles.container} edges={['bottom']} />;
  }

  const isWorking = !!session;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        {isWorking ? (
          <>
            <Text style={styles.label}>출근 시각</Text>
            <Text style={styles.timeText}>{formatTime(session.clockIn)}</Text>
            <Text style={styles.elapsedText}>경과 시간 {formatDuration(elapsed)}</Text>
          </>
        ) : (
          <>
            <Ionicons
              name="sunny-outline"
              size={48}
              color={colors.primary}
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.label}>오늘도 힘내세요!</Text>
            <Text style={styles.subLabel}>출근 버튼을 눌러 시작하세요</Text>
          </>
        )}
      </View>

      <View style={styles.buttonWrap}>
        <TouchableOpacity
          style={[styles.mainButton, { backgroundColor: isWorking ? colors.danger : colors.primary }]}
          onPress={isWorking ? handleClockOut : handleClockIn}
          activeOpacity={0.85}
        >
          <Text style={styles.mainButtonText}>{isWorking ? '퇴근하기' : '출근하기'}</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={!!summary} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="checkmark-circle" size={40} color={colors.success} />
            </View>
            <Text style={styles.modalTitle}>오늘 근무 완료</Text>
            <Text style={styles.modalSubtitle}>수고하셨습니다!</Text>

            {summary && (
              <View style={styles.modalTimeBox}>
                <View style={styles.modalTimeRow}>
                  <Text style={styles.modalTimeLabel}>출근</Text>
                  <Text style={styles.modalTimeValue}>{formatTime(summary.clockIn)}</Text>
                </View>
                <View style={styles.modalDivider} />
                <View style={styles.modalTimeRow}>
                  <Text style={styles.modalTimeLabel}>퇴근</Text>
                  <Text style={styles.modalTimeValue}>{formatTime(summary.clockOut)}</Text>
                </View>
              </View>
            )}

            {summary && (
              <View style={styles.modalTotalChip}>
                <Text style={styles.modalTotalLabel}>총 근무 시간</Text>
                <Text style={styles.modalTotalValue}>
                  {formatDuration(getDurationMs(summary.clockIn, summary.clockOut))}
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.modalButton} onPress={confirmSummary} activeOpacity={0.85}>
              <Text style={styles.modalButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerButton: { marginRight: 12, padding: 4 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  label: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 },
  subLabel: { fontSize: 14, color: colors.textSecondary },
  timeText: { fontSize: 40, fontWeight: '700', color: colors.text, marginBottom: 12 },
  elapsedText: { fontSize: 15, color: colors.textSecondary },
  buttonWrap: { paddingHorizontal: 24, paddingBottom: 32 },
  mainButton: {
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  mainButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 20, 30, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  modalTimeBox: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  modalTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalTimeLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalTimeValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '700',
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  modalTotalChip: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.primary + '14',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 20,
  },
  modalTotalLabel: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  modalTotalValue: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '800',
  },
  modalButton: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
