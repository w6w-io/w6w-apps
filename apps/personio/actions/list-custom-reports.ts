import type { ActionDefinition } from "@w6w/types";
import { compact, requestJson } from "../lib/client.ts";

/**
 * `GET /company/custom-reports/reports` — metadata (name, type, status, author, date
 * range) for the custom reports configured in Personio's Reports Builder. Use "Get Custom
 * Report" with a `report_id` from here to read a report's actual rows.
 */
interface Input {
  reportIds?: string[];
  status?: string;
}

interface ReportResource {
  attributes?: {
    id?: string;
    name?: string;
    description?: string;
    author_first_name?: string;
    author_last_name?: string;
    type?: string;
    status?: string;
  };
}

interface ListReportsResponse {
  data?: ReportResource[];
}

const listCustomReports: ActionDefinition<Input, unknown> = {
  key: "list-custom-reports",
  type: "read",
  resource: "report",
  title: "List Custom Reports",
  description: "List metadata for the custom reports configured in Personio's Reports " +
    "Builder — name, type, status, author. Use Get Custom Report to read a report's rows.",
  params: [
    { key: "reportIds", label: "Report IDs", type: "string", repeat: true, advanced: true },
    { key: "status", label: "Status", type: "string", advanced: true },
  ],
  output: [
    { key: "reports", type: "array", label: "Reports" },
  ],

  async execute(input, ctx) {
    const query = compact({ report_ids: input.reportIds, status: input.status });
    const res = await requestJson<ListReportsResponse>(ctx, "/company/custom-reports/reports", {
      query,
    });
    const reports = (res.data ?? []).map((r) => ({
      id: r.attributes?.id,
      name: r.attributes?.name,
      description: r.attributes?.description,
      authorFirstName: r.attributes?.author_first_name,
      authorLastName: r.attributes?.author_last_name,
      type: r.attributes?.type,
      status: r.attributes?.status,
    }));
    return { reports };
  },
};

export default listCustomReports;
