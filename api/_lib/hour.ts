/** UTC hour bucket id (unix hour). */
export function currentHourBucket(): string {
  return String(Math.floor(Date.now() / 3_600_000));
}

export function hourBucketToDate(bucket: string): Date {
  const hour = Number(bucket);
  return new Date(hour * 3_600_000);
}

export function previousHourBucket(): string {
  return String(Number(currentHourBucket()) - 1);
}

export function hourBucketLabel(bucket: string): string {
  const d = hourBucketToDate(bucket);
  return d.toISOString().replace(':00:00.000Z', 'Z');
}
