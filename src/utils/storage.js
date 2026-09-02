import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENT_SESSION_KEY = '@commute_app/current_session';
const RECORDS_KEY = '@commute_app/records';

// 현재 진행 중인 (출근했지만 아직 퇴근하지 않은) 세션
// { clockIn: ISOString } | null
export async function getCurrentSession() {
  try {
    const json = await AsyncStorage.getItem(CURRENT_SESSION_KEY);
    return json ? JSON.parse(json) : null;
  } catch (e) {
    console.error('getCurrentSession error', e);
    return null;
  }
}

export async function setCurrentSession(session) {
  try {
    await AsyncStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('setCurrentSession error', e);
  }
}

export async function clearCurrentSession() {
  try {
    await AsyncStorage.removeItem(CURRENT_SESSION_KEY);
  } catch (e) {
    console.error('clearCurrentSession error', e);
  }
}

// 전체 근무 기록: { 'YYYY-MM-DD': [ { id, clockIn, clockOut }, ... ] }
export async function getAllRecords() {
  try {
    const json = await AsyncStorage.getItem(RECORDS_KEY);
    return json ? JSON.parse(json) : {};
  } catch (e) {
    console.error('getAllRecords error', e);
    return {};
  }
}

export async function saveAllRecords(records) {
  try {
    await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('saveAllRecords error', e);
  }
}

// 특정 날짜에 근무 기록 한 건 추가 (같은 날 기존 기록이 있으면 리스트에 합산)
export async function addRecord(dateKey, record) {
  const records = await getAllRecords();
  const dayRecords = records[dateKey] || [];
  dayRecords.push(record);
  records[dateKey] = dayRecords;
  await saveAllRecords(records);
  return records;
}

export async function updateRecord(dateKey, recordId, updates) {
  const records = await getAllRecords();
  const dayRecords = records[dateKey] || [];
  const idx = dayRecords.findIndex((r) => r.id === recordId);
  if (idx !== -1) {
    dayRecords[idx] = { ...dayRecords[idx], ...updates };
    records[dateKey] = dayRecords;
    await saveAllRecords(records);
  }
  return records;
}

export async function deleteRecord(dateKey, recordId) {
  const records = await getAllRecords();
  const dayRecords = (records[dateKey] || []).filter((r) => r.id !== recordId);
  if (dayRecords.length > 0) {
    records[dateKey] = dayRecords;
  } else {
    delete records[dateKey];
  }
  await saveAllRecords(records);
  return records;
}

export function generateId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}
