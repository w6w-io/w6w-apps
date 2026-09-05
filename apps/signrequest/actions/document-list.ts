import type { ActionDefinition } from "@w6w/types";
import { compact, SignRequestClient } from "../lib/client.ts";
import { DOCUMENT_STATUS_HINT, limitParam, pageParam } from "../lib/params.ts";

interface Input {
  externalId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * `GET /documents/` — list documents, newest first. Paginated by `page` NUMBER (not `offset`) — see
 * `lib/client.ts`.
 */
const documentList: ActionDefinition<Input> = {
  key: "document-list",
  type: "read",
  resource: "document",
  title: "List Documents",
  description: "List documents, optionally filtered by external ID or status.",
  params: [
    { key: "externalId", label: "External ID", type: "string" },
    { key: "status", label: "Status", type: "string", hint: DOCUMENT_STATUS_HINT },
    pageParam,
    limitParam,
  ],
  output: [
    { key: "count", type: "number", label: "Total result count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "previous", type: "string", label: "Previous page URL" },
    { key: "results", type: "array", label: "Documents" },
  ],

  execute(input, ctx) {
    return new SignRequestClient(ctx).request("/documents/", {
      query: compact({
        external_id: input.externalId,
        status: input.status,
        page: input.page,
        limit: input.limit,
      }),
    });
  },
};

export default documentList;
