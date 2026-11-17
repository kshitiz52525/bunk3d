const IST = 330 * 60_000;
const HOUR = 3_600_000;

/** Epoch ms of the next India-time `hour` (0-23), `daysAhead` days from today. If today and already past, rolls to tomorrow. */
export function istAt(now: number, hour: number, daysAhead = 0): number {
  const dayStart = Math.floor((now + IST) / 86_400_000) * 86_400_000 - IST;
  let t = dayStart + daysAhead * 86_400_000 + hour * HOUR;
  if (t <= now) t += 86_400_000;
  return t;
}

/** Next given weekday (0 = Sunday) at an India-time hour. */
export function nextWeekday(now: number, dow: number, hour: number): number {
  for (let i = 0; i < 8; i++) {
    const t = istAt(now, hour, i);
    if (new Date(t + IST).getUTCDay() === dow && t > now) return t;
  }
  return istAt(now, hour, 7);
}

export function clock12(ts: number): string {
  const d = new Date(ts + IST);
  const h = d.getUTCHours();
  return `${h % 12 || 12}${d.getUTCMinutes() ? ':' + String(d.getUTCMinutes()).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`;
}
