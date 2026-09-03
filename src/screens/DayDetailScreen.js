import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { getAllRecords, updateRecord, deleteRecord, addRecord, generateId } from '../utils/storage';
import { formatTime, formatDuration, getDurationMs, toDateKey } from '../utils/dateUtils';
import { colors } from '../theme/colors';

export default function DayDetailScreen({ route, navigation }) {
  const { dateKey } = route.params;
  const [dayRecords, setDayRecords] = useState([]);
  const [pickerState, setPickerState] = useState(null); // { recordId, field: 'clockIn' | 'clockOut' }
  const [addFormVisible, setAddFormVisible] = useState(false);
  const [formDate, setFormDate] = useState(new Date(`${dateKey}T00:00:00`));
  const [formStart, setFormStart] = useState(new Date(`${dateKey}T09:00:00`));
  const [formEnd, setFormEnd] = useState(new Date(`${dateKey}T18:00:00`));
  const [formPickerField, setFormPickerField] = useState(null); // 'date' | 'start' | 'end'

  const openAddForm = () => {
    setFormDate(new Date(`${dateKey}T00:00:00`));
    setFormStart(new Date(`${dateKey}T09:00:00`));
    setFormEnd(new Date(`${dateKey}T18:00:00`));
    setAddFormVisible(true);
  };

  const combineDateTime = (datePart, timePart) => {
    const d = new Date(datePart);
    d.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
    return d;
  };

  const handleFormPickerChange = (event, selected) => {
    const field = formPickerField;
    setFormPickerField(null);
    if (Platform.OS === 'android' && event.type === 'dismissed') return;
    if (!selected) return;
    if (field === 'date') setFormDate(selected);
    if (field === 'start') setFormStart(selected);
    if (field === 'end') setFormEnd(selected);
  };

  const handleAddSubmit = async () => {
    let clockIn = combineDateTime(formDate, formStart);
    let clockOut = combineDateTime(formDate, formEnd);
    // 퇴근이 출근보다 이르면 다음날로 간주 (야간근무 로직과 동일)
    if (clockOut.getTime() <= clockIn.getTime()) {
      clockOut = new Date(clockOut.getTime() + 24 * 60 * 60 * 1000);
    }
    const targetDateKey = toDateKey(clockIn); // 변경한 날짜 기준으로 저장
    const record = { id: generateId(), clockIn: clockIn.toISOString(), clockOut: clockOut.toISOString() };
    await addRecord(targetDateKey, record);
    setAddFormVisible(false);

    if (targetDateKey === dateKey) {
      load();
    } else {
      navigation.replace('DayDetail', { dateKey: targetDateKey }); // 다른 날짜로 바꿨다면 그 날짜 상세로 이동
    }
  };

  const load = useCallback(async () => {
    const all = await getAllRecords();
    const list = (all[dateKey] || [])
      .slice()
      .sort((a, b) => new Date(a.clockIn) - new Date(b.clockIn));
    setDayRecords(list);
  }, [dateKey, navigation]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalMs = dayRecords.reduce((acc, r) => acc + getDurationMs(r.clockIn, r.clockOut), 0);

  const openPicker = (recordId, field) => setPickerState({ recordId, field });

  const onPickerChange = async (event, selectedDate) => {
    const current = pickerState;
    setPickerState(null);
    if (Platform.OS === 'android' && event.type === 'dismissed') return;
    if (!selectedDate || !current) return;

    const record = dayRecords.find((r) => r.id === current.recordId);
    if (!record) return;

    // 항상 '출근일' 날짜를 기준으로 고정 — 이전에 저장된 +1일 보정값의 영향을 받지 않도록 함
    const baseDate = new Date(record.clockIn);
    baseDate.setHours(0, 0, 0, 0);

    const applyTime = (timeSource) => {
      const d = new Date(baseDate);
      d.setHours(timeSource.getHours());
      d.setMinutes(timeSource.getMinutes());
      d.setSeconds(0, 0);
      return d;
    };

    // clockIn/clockOut 모두 매번 baseDate 기준으로 시:분만 다시 얹어서 재계산
    let newClockIn = applyTime(current.field === 'clockIn' ? selectedDate : new Date(record.clockIn));
    let newClockOut = applyTime(current.field === 'clockOut' ? selectedDate : new Date(record.clockOut));

    // 퇴근이 출근보다 이르거나 같으면 다음날 퇴근으로 간주
    if (newClockOut.getTime() <= newClockIn.getTime()) {
      newClockOut = new Date(newClockOut.getTime() + 24 * 60 * 60 * 1000);
    }

    await updateRecord(dateKey, current.recordId, {
      clockIn: newClockIn.toISOString(),
      clockOut: newClockOut.toISOString(),
    });
    load();
  };

  const handleDelete = (recordId) => {
    Alert.alert('기록 삭제', '이 근무 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteRecord(dateKey, recordId);
          load();
        },
      },
    ]);
  };

  const [year, month, day] = dateKey.split('-');
  const activePickerRecord = pickerState
    ? dayRecords.find((r) => r.id === pickerState.recordId)
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <Text style={styles.dateText}>
            {year}년 {parseInt(month, 10)}월 {parseInt(day, 10)}일
          </Text>
          <Text style={styles.totalText}>{formatDuration(totalMs)}</Text>
          <Text style={styles.totalLabel}>총 근무 시간</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddForm} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.addButtonText}>일정 추가</Text>
        </TouchableOpacity>
        {dayRecords.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-clear-outline" size={32} color={colors.textSecondary} />
            <Text style={styles.emptyText}>이 날짜에 등록된 근무 기록이 없어요</Text>
          </View>
        )}

        {dayRecords.map((record, index) => (
          <View key={record.id} style={styles.recordCard}>
            <View style={styles.recordHeader}>
              <Text style={styles.recordIndex}>{index + 1}번째 근무</Text>
              <TouchableOpacity
                onPress={() => handleDelete(record.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeCol}>
                <Text style={styles.timeLabel}>출근</Text>
                <TouchableOpacity style={styles.timeButton} onPress={() => openPicker(record.id, 'clockIn')}>
                  <Text style={styles.timeValue}>{formatTime(record.clockIn)}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.timeLabel}>퇴근</Text>
                <TouchableOpacity style={styles.timeButton} onPress={() => openPicker(record.id, 'clockOut')}>
                  <Text style={styles.timeValue}>{formatTime(record.clockOut)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.recordDuration}>
              {formatDuration(getDurationMs(record.clockIn, record.clockOut))}
            </Text>
          </View>
        ))}
      </ScrollView>

      <Modal visible={addFormVisible} transparent animationType="slide" onRequestClose={() => setAddFormVisible(false)}>
        <View style={styles.formOverlay}>
          <View style={styles.formSheet}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>일정 추가</Text>
              <TouchableOpacity onPress={() => setAddFormVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>날짜</Text>
            <TouchableOpacity style={styles.formField} onPress={() => setFormPickerField('date')}>
              <Text style={styles.formFieldText}>
                {formDate.getFullYear()}년 {formDate.getMonth() + 1}월 {formDate.getDate()}일
              </Text>
            </TouchableOpacity>

            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <Text style={styles.formLabel}>시작 시간</Text>
                <TouchableOpacity style={styles.formField} onPress={() => setFormPickerField('start')}>
                  <Text style={styles.formFieldText}>{formatTime(formStart)}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.formCol}>
                <Text style={styles.formLabel}>종료 시간</Text>
                <TouchableOpacity style={styles.formField} onPress={() => setFormPickerField('end')}>
                  <Text style={styles.formFieldText}>{formatTime(formEnd)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {formPickerField && (
              <DateTimePicker
                value={formPickerField === 'date' ? formDate : formPickerField === 'start' ? formStart : formEnd}
                mode={formPickerField === 'date' ? 'date' : 'time'}
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleFormPickerChange}
                style={styles.formPicker}
              />
            )}

            <TouchableOpacity style={styles.formSubmitButton} onPress={handleAddSubmit} activeOpacity={0.85}>
              <Text style={styles.formSubmitText}>추가</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {pickerState && activePickerRecord && (
        <DateTimePicker
          value={new Date(activePickerRecord[pickerState.field])}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPickerChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  dateText: { fontSize: 14, color: colors.textSecondary, marginBottom: 6 },
  totalText: { fontSize: 32, fontWeight: '700', color: colors.primary },
  totalLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  recordCard: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12 },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordIndex: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeCol: { flex: 1 },
  timeLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  timeButton: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeValue: { fontSize: 16, fontWeight: '600', color: colors.text },
  recordDuration: { marginTop: 10, fontSize: 13, color: colors.primary, fontWeight: '600', textAlign: 'right' },
  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%',
    alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 18,
    borderRadius: 16, borderWidth: 1, borderColor: colors.primary, marginBottom: 20,
  },
  addButtonText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 13, color: colors.textSecondary },
  formOverlay: { flex: 1, backgroundColor: 'rgba(17,20,30,0.5)', justifyContent: 'flex-end' },
  formSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 75 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  formTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  formLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  formField: { backgroundColor: colors.background, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border },
  formFieldText: { fontSize: 15, fontWeight: '600', color: colors.text },
  formRow: { flexDirection: 'row', gap: 12 },
  formCol: { flex: 1 },
  formPicker: { marginTop: 8 },
  formSubmitButton: { height: 52, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  formSubmitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
