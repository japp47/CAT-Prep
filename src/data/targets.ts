/** Percentiles a student can aim for in VARC. 99 is the default, because the chart's target band was always set for it. */
// Apart from the percentile tables in percentiles.ts, so saved data (lib/state.ts) can check a target without loading the tables.
export const TARGET_CHOICES = [90, 95, 97, 99] as const;
export const DEFAULT_TARGET = 99;
