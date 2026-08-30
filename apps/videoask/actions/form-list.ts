import type { ActionDefinition } from "@w6w/types";
import { VideoAskClient } from "../lib/client.ts";
import { organizationIdParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /forms` — every form (videoask) in the account, newest first.
 *
 * Confirmed `{count, next, previous, results}` envelope, `limit`/`offset`
 * pagination. The vendor's example default is `limit=20, offset=0`; that
 * default is kept here rather than widened, since `limit` has no documented
 * ceiling and a caller who wants more can raise it explicitly.
 */
interface Input {
  limit?: number;
  offset?: number;
  organizationId?: string;
}

const formList: ActionDefinition<Input> = {
  key: "form-list",
  type: "read",
  resource: "form",
  title: "List Forms",
  description: "List all forms (videoasks) in the account, sorted by creation date descending.",
  params: [...paginationParams(20), organizationIdParam],
  output: [
    { key: "count", type: "number", label: "Total form count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "previous", type: "string", label: "Previous page URL" },
    { key: "results", type: "array", label: "Forms" },
  ],

  execute(input, ctx) {
    return new VideoAskClient(ctx).list("/forms", {
      query: { limit: input.limit, offset: input.offset },
      organizationId: input.organizationId,
    });
  },
};

export default formList;
