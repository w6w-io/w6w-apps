import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments, option lists and input normalisers for the Datadog
 * actions.
 *
 * Every enum here is copied from Datadog's OpenAPI documents (fetched
 * 2026-08-11), not inferred, and every default states whether it is the
 * vendor's own or this app's.
 *
 * ## Three incompatible spellings of "when"
 *
 * This is the single most common way a working Datadog query returns nothing,
 * and it is why the time params are never shared across resources here:
 *
 *  - **v1 timeseries and events** (`GET /api/v1/query`, `GET /api/v1/events`,
 *    `GET /api/v1/metrics`) take POSIX **seconds**, as `int64`.
 *  - **v2 events** (`GET /api/v2/events`) takes `filter[from]` / `filter[to]`
 *    as strings the vendor documents as **milliseconds**.
 *  - **v2 logs** (`POST /api/v2/logs/events/search`) takes strings supporting
 *    **date math** — `now-15m`, `now` — which are that endpoint's own
 *    documented defaults.
 *
 * Passing seconds where milliseconds are expected asks for a window in 1970 and
 * gets an empty result set rather than an error. Each action states its unit in
 * the param hint, in the unit that endpoint actually takes.
 */

/** `EventAlertType`, from the v1 `EventCreateRequest` schema. */
export const alertTypeOptions = [
  { value: "info", label: "Info (default)" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
  { value: "user_update", label: "User update" },
  { value: "recommendation", label: "Recommendation" },
  { value: "snapshot", label: "Snapshot" },
];

/** `EventPriority`. Nullable in the schema; Datadog treats absence as `normal`. */
export const eventPriorityOptions = [
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];

/** `EventsSort` and `LogsSort` share this vocabulary exactly. */
export const timestampSortOptions = [
  { value: "timestamp", label: "Oldest first (timestamp)" },
  { value: "-timestamp", label: "Newest first (-timestamp)" },
];

/** `LogsStorageTier`. */
export const logStorageTierOptions = [
  { value: "indexes", label: "Indexes (default)" },
  { value: "online-archives", label: "Online Archives" },
  { value: "flex", label: "Flex Logs" },
];

/**
 * `MetricIntakeType` — the integer the v2 submission endpoint takes.
 *
 * These are numbers on the wire (`0`–`3`), not the names used everywhere else
 * in Datadog's UI. `0` is "unspecified", which lets Datadog keep whatever type
 * the metric already has; it is the vendor's own default and is preserved here.
 */
export const metricTypeOptions = [
  { value: 0, label: "Unspecified — keep the metric's existing type (default)" },
  { value: 1, label: "Count" },
  { value: 2, label: "Rate" },
  { value: 3, label: "Gauge" },
];

/** `MetricTagConfigurationMetricTypeCategory`, for the v2 metric list filter. */
export const metricTypeCategoryOptions = [
  { value: "count", label: "Count" },
  { value: "gauge", label: "Gauge" },
  { value: "rate", label: "Rate" },
  { value: "distribution", label: "Distribution" },
];

/** `QuerySortOrder`. */
export const sortDirectionOptions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

/** A comma-separated tag filter, spelled the same way on several endpoints. */
export function tagsParam(key: string, label: string, hint: string): Param {
  return { key, label, type: "string", hint, placeholder: "env:prod,service:web" };
}

/**
 * A cursor-paginated `page[limit]` / `page[cursor]` pair (v2 events, v2 logs).
 *
 * The vendor default is 10 and the maximum is 1000. 10 is small enough to be
 * safe, so unlike most vendors Datadog's default is kept — it is stated
 * explicitly so nobody has to guess whether it was chosen.
 */
export function cursorPageParams(vendorDefault: number, max: number): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: vendorDefault,
      validation: { integer: true, min: 1, max },
      hint: `Maximum results in one response. Datadog's own default is ${vendorDefault}; the ` +
        `maximum is ${max}.`,
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      advanced: true,
      hint: "Take it from `meta.page.after` of a previous response to fetch the next page.",
    },
  ];
}

/** A point as Datadog's v2 submission endpoint wants it. */
export interface MetricPoint {
  timestamp: number;
  value: number;
}

/**
 * Turn what a user can plausibly type into `MetricSeries.points`.
 *
 * Accepts a bare number (one point at `now`), one `{timestamp, value}` object,
 * or an array of them. `timestamp` defaults to the current time in **seconds**
 * — Datadog's `MetricPoint.timestamp` is `int64` seconds, and passing
 * `Date.now()` (milliseconds) puts the point roughly 55,000 years in the future,
 * where it is silently dropped rather than rejected.
 *
 * The vendor's stated window is the other half of that trap: a point may be at
 * most **10 minutes in the future and 1 hour in the past**. This function does
 * not clamp to it — clamping would move a user's data — but the action's hint
 * says so, and a point outside it is accepted with a `202` and never appears on
 * a graph.
 *
 * Exported and unit-tested because it is the one place a submitted metric can be
 * silently corrupted.
 */
export function normalizeMetricPoints(value: unknown, nowSeconds: number): MetricPoint[] {
  const raw = Array.isArray(value) ? value : [value];
  const points: MetricPoint[] = [];
  for (const entry of raw) {
    if (typeof entry === "number") {
      if (!Number.isFinite(entry)) throw new Error("Points: value must be a finite number");
      points.push({ timestamp: nowSeconds, value: entry });
      continue;
    }
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(
        'Points must be a number, an object like {"timestamp": 1700000000, "value": 42}, or ' +
          "an array of such objects",
      );
    }
    const obj = entry as { timestamp?: unknown; value?: unknown };
    const value_ = typeof obj.value === "string" ? Number(obj.value) : obj.value;
    if (typeof value_ !== "number" || !Number.isFinite(value_)) {
      throw new Error("Points: every point needs a finite numeric `value`");
    }
    const ts = typeof obj.timestamp === "string" ? Number(obj.timestamp) : obj.timestamp;
    if (ts !== undefined && (typeof ts !== "number" || !Number.isFinite(ts))) {
      throw new Error("Points: `timestamp` must be a POSIX timestamp in seconds");
    }
    points.push({ timestamp: ts === undefined ? nowSeconds : ts, value: value_ });
  }
  if (points.length === 0) throw new Error("Points: at least one point is required");
  return points;
}

/**
 * `monitor_id` path/query segments arrive from a form as strings; Datadog's v1
 * monitor endpoints declare them `int64` and reject a quoted number in a body.
 */
export function asInteger(value: unknown, label: string): number {
  const n = typeof value === "string" ? Number(value.trim()) : value;
  if (typeof n !== "number" || !Number.isInteger(n)) {
    throw new Error(`${label} must be a whole number`);
  }
  return n;
}
