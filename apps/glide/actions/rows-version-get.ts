import type { ActionDefinition } from "@w6w/types";
import { GlideClient } from "../lib/client.ts";
import { tableIdParam } from "../lib/params.ts";

/**
 * `HEAD /tables/{tableID}/rows` — the table's current version, as the `ETag`
 * response header. No body: Glide's own data-versioning guide says to poll
 * this to detect changes without downloading the data, and to pass the value
 * back as `If-Match` on Update Row / Overwrite Table to guard against a
 * concurrent edit.
 */
interface Input {
  tableId: string;
}

interface Output {
  etag?: string;
}

const rowsVersionGet: ActionDefinition<Input, Output> = {
  key: "rows-version-get",
  type: "read",
  resource: "row",
  title: "Get Rows Version",
  description: "Read a Big Table's current version (ETag) without fetching its rows.",
  params: [tableIdParam],
  output: [{ key: "etag", type: "string", label: "Current ETag / version, quoted" }],

  async execute(input, ctx) {
    const res = await new GlideClient(ctx).send(
      `/tables/${encodeURIComponent(input.tableId)}/rows`,
      { method: "HEAD" },
    );
    return { etag: res.headers.get("etag") ?? undefined };
  },
};

export default rowsVersionGet;
