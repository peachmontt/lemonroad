/** UTC day bucket in YYYY-MM-DD format. */
export function currentDayBucket(): string {
  return new Date().toISOString().slice(0, 10);
}

export function previousDayBucket(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Parse a YYYY-MM-DD string into a Date at midnight UTC. */
export function dayBucketToDate(bucket: string): Date {
  return new Date(`${bucket}T00:00:00.000Z`);
}
