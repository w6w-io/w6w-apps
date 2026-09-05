import type { ActionDefinition } from "@w6w/types";
import { compact, csv, json, resolveSiteUrl, SearchConsoleClient } from "../lib/client.ts";
import { SITE_URL_PARAM } from "../lib/params.ts";

/**
 * `POST webmasters/v3/sites/{siteUrl}/searchAnalytics/query` — verified
 * against Google's discovery document (`webmasters.searchanalytics.query`).
 * This is the Performance report's data source: clicks, impressions, CTR and
 * average position, optionally grouped by up to `DATE`, `QUERY`, `PAGE`,
 * `COUNTRY`, `DEVICE`, `SEARCH_APPEARANCE` or `HOUR`.
 *
 * `startDate`/`endDate` are `[Required]` per the discovery document — there
 * is no relative-date shorthand here the way GA4 has `yesterday`/`NdaysAgo`,
 * so both are plain required `YYYY-MM-DD` strings in PST.
 *
 * Dimensions are taken as a comma-separated list and expanded into the
 * `string[]` the API wants, matching this pack's `google-analytics`
 * convention. `dimensionFilterGroups` stays JSON — it's a nested
 * AND/OR expression tree over dimension values, and flattening it into form
 * fields could only express the simplest single-filter case.
 */
const action: ActionDefinition = {
  key: "search-analytics-query",
  type: "read",
  resource: "search-analytics",
  title: "Query Search Analytics",
  description: "Run a Search Analytics query — clicks, impressions, CTR and position.",
  params: [
    SITE_URL_PARAM,
    {
      key: "startDate",
      label: "Start Date",
      type: "string",
      required: true,
      placeholder: "2026-08-01",
      hint: "YYYY-MM-DD, in PST (UTC-8:00).",
    },
    {
      key: "endDate",
      label: "End Date",
      type: "string",
      required: true,
      placeholder: "2026-08-31",
      hint: "YYYY-MM-DD, in PST (UTC-8:00). Must be on or after Start Date.",
    },
    {
      key: "dimensions",
      label: "Dimensions",
      type: "string",
      default: "",
      placeholder: "date,query",
      hint: "Comma-separated: DATE, QUERY, PAGE, COUNTRY, DEVICE, SEARCH_APPEARANCE, HOUR. " +
        "HOUR requires Data State = HOURLY_ALL.",
    },
    {
      key: "type",
      label: "Search Type",
      type: "select",
      default: "WEB",
      options: [
        { label: "Web", value: "WEB" },
        { label: "Image", value: "IMAGE" },
        { label: "Video", value: "VIDEO" },
        { label: "News", value: "NEWS" },
        { label: "Discover", value: "DISCOVER" },
        { label: "Google News", value: "GOOGLE_NEWS" },
      ],
    },
    {
      key: "aggregationType",
      label: "Aggregation Type",
      type: "select",
      default: "AUTO",
      options: [
        { label: "Auto", value: "AUTO" },
        { label: "By property", value: "BY_PROPERTY" },
        { label: "By page", value: "BY_PAGE" },
        { label: "By News Showcase panel", value: "BY_NEWS_SHOWCASE_PANEL" },
      ],
      hint: "AUTO is required whenever you filter or group by page.",
    },
    {
      key: "dataState",
      label: "Data State",
      type: "select",
      default: "FINAL",
      options: [
        { label: "Final only", value: "FINAL" },
        { label: "All (final + partial)", value: "ALL" },
        { label: "Hourly (final + partial)", value: "HOURLY_ALL" },
      ],
    },
    {
      key: "rowLimit",
      label: "Row Limit",
      type: "number",
      default: 1000,
      hint: "1 to 25,000. Defaults to 1,000.",
    },
    { key: "startRow", label: "Start Row", type: "number", default: 0 },
    {
      key: "dimensionFilterGroups",
      label: "Dimension Filter Groups",
      type: "json",
      default: "",
      placeholder: '[{"filters":[{"dimension":"QUERY","operator":"CONTAINS","expression":"buy"}]}]',
      hint: "A list of ApiDimensionFilterGroup — see the Search Console API reference.",
    },
  ],
  output: [
    { key: "rows", type: "array", label: "Rows" },
    { key: "responseAggregationType", type: "string", label: "Aggregation used" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const siteUrl = resolveSiteUrl(ctx.connection, p.siteUrl);
    const startDate = String(p.startDate ?? "").trim();
    const endDate = String(p.endDate ?? "").trim();
    if (!startDate) throw new Error("`startDate` is required");
    if (!endDate) throw new Error("`endDate` is required");

    const body = compact({
      startDate,
      endDate,
      dimensions: csv(p.dimensions),
      type: p.type,
      aggregationType: p.aggregationType === "AUTO" ? undefined : p.aggregationType,
      dataState: p.dataState === "FINAL" ? undefined : p.dataState,
      rowLimit: typeof p.rowLimit === "number" ? p.rowLimit : undefined,
      startRow: typeof p.startRow === "number" && p.startRow > 0 ? p.startRow : undefined,
      dimensionFilterGroups: json(p.dimensionFilterGroups, "dimensionFilterGroups"),
    });

    ctx.log("info", "running Search Analytics query", { siteUrl, startDate, endDate });

    return await new SearchConsoleClient(ctx).request(
      `webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      { method: "POST", body },
    );
  },
};

export default action;
