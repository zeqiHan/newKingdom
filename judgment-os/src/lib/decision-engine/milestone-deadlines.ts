/** YYYY-MM-DD helpers for generated milestones. */

export function asIsoDate(value: unknown): string | null {
  const match = String(value ?? "").trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  const time = Date.parse(`${match[1]}T00:00:00.000Z`);
  if (Number.isNaN(time)) return null;
  return match[1];
}

export function addIsoDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function defaultRecommendedDate(today = new Date().toISOString().slice(0, 10)): string {
  return addIsoDays(today, 21);
}

/**
 * Give every milestone a date.
 * The first deadline is never later than today+3, and never later than the
 * project deadline. Later milestones stay in order and finish by the project deadline.
 */
export function assignMilestoneDeadlines(
  rawDeadlines: Array<string | null | undefined>,
  recommendedDeadline: string,
  today = new Date().toISOString().slice(0, 10),
): string[] {
  const count = Math.min(3, rawDeadlines.length);
  if (count === 0) return [];

  const projectEnd = recommendedDeadline < today ? today : recommendedDeadline;
  const firstLatest = projectEnd < addIsoDays(today, 3) ? projectEnd : addIsoDays(today, 3);
  const first = clampDate(asIsoDate(rawDeadlines[0]), today, firstLatest) ?? firstLatest;

  const later = defaultLaterDates(first, projectEnd, count - 1);
  const dates = [first];
  let previous = first;
  for (let i = 0; i < count - 1; i++) {
    let date = asIsoDate(rawDeadlines[i + 1]);
    if (!date || date < previous || date > projectEnd) {
      date = later[i] ?? projectEnd;
    }
    if (date < previous) date = previous;
    if (date > projectEnd) date = projectEnd;
    dates.push(date);
    previous = date;
  }
  return dates;
}

function clampDate(value: string | null, min: string, max: string): string | null {
  if (!value) return null;
  if (value < min || value > max) return null;
  return value;
}

function defaultLaterDates(first: string, end: string, count: number): string[] {
  if (count <= 0) return [];
  if (end <= first) return Array.from({ length: count }, () => first);
  const start = Date.parse(`${first}T00:00:00.000Z`);
  const finish = Date.parse(`${end}T00:00:00.000Z`);
  return Array.from({ length: count }, (_, index) => {
    const at = start + Math.round((finish - start) * ((index + 1) / count));
    return new Date(at).toISOString().slice(0, 10);
  });
}
