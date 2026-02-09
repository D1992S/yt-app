export const formatDateISO = (date: Date | string | number): string => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const getDaysBetween = (start: Date, end: Date): number => {
  const oneDay = 1000 * 60 * 60 * 24;
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / oneDay);
};

export const getPreviousPeriod = (start: Date, end: Date): { start: Date; end: Date } => {
  const duration = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - duration);
  const prevEnd = new Date(end.getTime() - duration);
  return { start: prevStart, end: prevEnd };
};

export const getRangeFromPreset = (preset: string): { start: Date; end: Date } => {
  const end = new Date();
  let start = new Date();
  
  switch (preset) {
    case 'last_7d':
      start = addDays(end, -7);
      break;
    case 'last_28d':
      start = addDays(end, -28);
      break;
    case 'last_90d':
      start = addDays(end, -90);
      break;
    case 'last_365d':
      start = addDays(end, -365);
      break;
    default:
      start = addDays(end, -28);
  }
  return { start, end };
};
