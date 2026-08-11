import type { ActionDefinition } from "@w6w/types";
import { unwrap, WufooClient } from "../lib/client.ts";

/**
 * `GET /reports/{identifier}/entries.json` — the entries behind a report.
 *
 * A report already encodes its own filters, so this takes only paging: adding
 * more filters here would be fighting the saved view rather than using it. For
 * ad-hoc filtering, use List Form Entries instead.
 */
interface Input {
  identifier: string;
  pageStart?: number;
  pageSize?: number;
  system?: boolean;
}

const reportEntries: ActionDefinition<Input> = {
  key: "report-entries",
  type: "search",
  resource: "entry",
  title: "List Report Entries",
  description:
    "List the entries a saved report returns. The report's own filters apply — use List Form " +
    "Entries for ad-hoc filtering.",
  params: [
    {
      key: "identifier",
      label: "Report hash or title",
      type: "string",
      required: true,
      hint: "From List Reports.",
    },
    {
      key: "pageStart",
      label: "Page start (offset)",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      validation: { integer: true, min: 1, max: 100 },
      hint: "Default 25, maximum 100.",
    },
    { key: "system", label: "Include system fields", type: "boolean" },
  ],
  output: [{ key: "[]", type: "array", label: "Entries — keyed by field id" }],

  async execute(input, ctx) {
    const body = await new WufooClient(ctx).request(
      `/reports/${encodeURIComponent(input.identifier)}/entries.json`,
      { query: { pageStart: input.pageStart, pageSize: input.pageSize, system: input.system } },
    );
    return unwrap(body, "Entries");
  },
};

export default reportEntries;
