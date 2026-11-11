// App timestamps only. Keep the stored instant and the viewer's local time zone.
export function formatAppDateTime(value, locale = "ko") {
  const date = new Date(value);
  if (locale !== "ko") return date.toLocaleString("en-US");
  if (Number.isNaN(date.getTime())) return "저장 시각 확인 불가";

  // ICU/OS locale data can return AM/PM even for ko-KR. Do not use its day-period text.
  const hour = date.getHours();
  const period = hour < 12 ? "오전" : "오후";
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}. ${period} ${hour % 12 || 12}:${minute}:${second}`;
}
