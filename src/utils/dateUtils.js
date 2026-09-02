// 날짜를 'YYYY-MM-DD' 형태의 키로 변환 (react-native-calendars의 dateString 포맷과 동일)
export function toDateKey(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// '오전 9:03' 같은 형태로 시간 표시
export function formatTime(date) {
  const d = new Date(date);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? '오후' : '오전';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${ampm} ${hours}:${minutes}`;
}

// ms를 'N시간 N분' 형태로 표시
export function formatDuration(ms) {
  if (!ms || ms <= 0) return '0분';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

// ms를 'N:N' 형태로 표시
export function formatDurationTimer(ms) {
  if (!ms || ms <= 0) return '0:00';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  if (hours === 0) return `0:${minutes}`;
  if (minutes === 0) return `${hours}:00`;
  return `${hours}:${minutes}`;
}

export function getDurationMs(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0;
  const inD = new Date(clockIn);
  const outD = new Date(clockOut);
  inD.setSeconds(0, 0);
  outD.setSeconds(0, 0);
  return outD.getTime() - inD.getTime();
}
