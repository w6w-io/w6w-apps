import type { ActionDefinition } from "@w6w/types";
import { compact, requestJson } from "../lib/client.ts";

/**
 * `GET /company/custom-reports/reports/{report_id}` — a report's actual rows. Personio's
 * schema documents `attributes` as one of three different shapes depending on the
 * report's `type` (`point_in_time`, `timeframe`, `historical_data`) with no discriminant
 * field named in common — so `items` is returned exactly as Personio sends it rather than
 * forced into one guessed shape.
 */
interface Input {
  reportId: string;
  locale?: string;
  page?: number;
  limit?: number;
}

interface ReportResponse {
  metadata?: { total_elements?: number; current_page?: number; total_pages?: number };
  data?: unknown[];
}

const getCustomReport: ActionDefinition<Input, unknown> = {
  key: "get-custom-report",
  type: "read",
  resource: "report",
  title: "Get Custom Report",
  description: "Read a custom report's rows by its id (from List Custom Reports).",
  params: [
    { key: "reportId", label: "Report ID", type: "string", required: true },
    { key: "locale", label: "Locale", type: "string", advanced: true, placeholder: "en" },
    { key: "page", label: "Page", type: "number", advanced: true },
    { key: "limit", label: "Limit", type: "number", advanced: true },
  ],
  output: [
    { key: "items", type: "array", label: "Report rows (shape varies by report type)" },
    { key: "totalElements", type: "number", label: "Total elements" },
    { key: "totalPages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const query = compact({ locale: input.locale, page: input.page, limit: input.limit });
    const res = await requestJson<ReportResponse>(
      ctx,
      `/company/custom-reports/reports/${encodeURIComponent(input.reportId)}`,
      { query },
    );
    return {
      items: res.data ?? [],
      totalElements: res.metadata?.total_elements,
      totalPages: res.metadata?.total_pages,
    };
  },
};

export default getCustomReport;
