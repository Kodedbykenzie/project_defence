export const HOME_TZ = 'Africa/Kigali';
export const HOME_CITY = 'Kigali';

export const pad = (n: number) => String(n).padStart(2, '0');

export function zonedParts(date: Date, timeZone: string) {
  const parts: Record<string, string> = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).
  formatToParts(date).
  forEach((p) => {
    parts[p.type] = p.value;
  });
  return {
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday,
    day: parts.day,
    month: parts.month,
    year: parts.year
  };
}

export function utcOffsetLabel(date: Date, timeZone: string) {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }).
    formatToParts(date).
    find((p) => p.type === 'timeZoneName');
    return (part?.value ?? 'GMT').replace('GMT', 'UTC');
  } catch {
    return 'UTC';
  }
}

export function greetingKey(hour: number) {
  if (hour < 5) return 'goodNight' as const;
  if (hour < 12) return 'goodMorning' as const;
  if (hour < 17) return 'goodAfternoon' as const;
  return 'goodEvening' as const;
}

export const worldClocks = [
{ city: 'Nairobi', timeZone: 'Africa/Nairobi' },
{ city: 'Lagos', timeZone: 'Africa/Lagos' },
{ city: 'London', timeZone: 'Europe/London' }];