import type { ActionDefinition } from "@w6w/types";
import { compact, groupPath, PowerBIClient } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

interface Input {
  groupId?: string;
  datasetId: string;
  query: string;
  includeNulls?: boolean;
  impersonatedUserName?: string;
}

interface QueryError {
  code?: string;
  message?: string;
}

interface TableResult {
  rows: Record<string, unknown>[];
}

interface Output {
  tables?: TableResult[];
  error?: QueryError;
}

/**
 * `POST [/groups/{groupId}]/datasets/{datasetId}/executeQueries`
 * https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/execute-queries ·
 * https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/execute-queries-in-group
 *
 * Runs a single DAX query (`EVALUATE ...`) against the dataset's model and
 * returns its rows. "One query per API call, one table per query" per the
 * reference's own limitations, so this action takes one `query` string
 * rather than the array the wire format technically allows — Power BI itself
 * rejects more than one anyway.
 *
 * `results[0]` is unwrapped in the return value: since only one query is ever
 * sent, `results` always has exactly one entry, and forcing every caller to
 * index into a redundant one-element array would be inventing ceremony the
 * reference itself doesn't have.
 *
 * A query error still answers `200 OK` with `results[0].error` set rather
 * than an HTTP failure — this action passes that through under `error`
 * unmodified rather than throwing, since it is a normal, documented outcome
 * (a failed DAX expression), not a transport failure.
 *
 * Required scope: `Dataset.ReadWrite.All` or `Dataset.Read.All`. The tenant
 * setting "Dataset Execute Queries REST API" must also be enabled, and the
 * caller needs both dataset read and build permission.
 *
 * Limitations the reference states: no Azure Analysis Services / live-connect
 * datasets; max 100,000 rows or 1,000,000 values per query (whichever hits
 * first) and 15 MB per query; 120 requests/minute per user across every
 * dataset; DAX only — no MDX, INFO functions or DMV queries.
 */
const executeDatasetQueries: ActionDefinition<Input, Output> = {
  key: "execute-dataset-queries",
  type: "search",
  resource: "dataset",
  title: "Execute Dataset Query",
  description: "Run a single DAX query against a dataset's model and return its result rows.",
  params: [
    groupIdParam,
    { key: "datasetId", label: "Dataset ID", type: "string", required: true },
    {
      key: "query",
      label: "DAX query",
      type: "text",
      required: true,
      placeholder: "EVALUATE VALUES(MyTable)",
    },
    {
      key: "includeNulls",
      label: "Include nulls",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Include columns with all-null values in the result, instead of omitting them.",
    },
    {
      key: "impersonatedUserName",
      label: "Impersonate user (UPN)",
      type: "string",
      advanced: true,
      hint:
        "Run the query under a specific user's row-level-security identity. Ignored if the model has no RLS.",
    },
  ],
  output: [
    { key: "tables", type: "array", label: "Result tables" },
    { key: "error", type: "object", label: "DAX query error, if the query failed" },
  ],

  async execute(input, ctx) {
    const client = new PowerBIClient(ctx);
    const body = await client.request<{ results: Output[] }>(
      `${groupPath(input)}/datasets/${encodeURIComponent(input.datasetId)}/executeQueries`,
      {
        method: "POST",
        body: compact({
          queries: [{ query: input.query }],
          serializerSettings: input.includeNulls ? { includeNulls: true } : undefined,
          impersonatedUserName: input.impersonatedUserName,
        }),
      },
    );
    return body?.results?.[0] ?? { tables: [] };
  },
};

export default executeDatasetQueries;
