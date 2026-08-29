import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, type DialpadPage } from "../lib/client.ts";
import { cursorParam, targetTypeOptions } from "../lib/params.ts";

/**
 * `GET /api/v2/call` — a paginated, reverse-chronological list of concluded
 * calls.
 *
 * **Only concluded calls.** The vendor's own note: "This API will only include
 * calls that have already concluded." A call in progress will not appear until
 * it ends.
 *
 * **The default scope depends on the credential.** "When no target is
 * specified, user-level API keys list the authenticated user's own calls, and
 * company-level API keys list all of the company's calls." `targetId` /
 * `targetType` narrow either case to one target.
 */
interface Input {
  cursor?: string;
  includeAnonymized?: boolean;
  startedAfter?: number;
  startedBefore?: number;
  targetId?: string;
  targetType?: string;
}

const callList: ActionDefinition<Input> = {
  key: "call-list",
  type: "search",
  resource: "call",
  title: "List Calls",
  description:
    "List concluded calls in reverse-chronological order (most recent first). A user-level API " +
    "key lists that user's own calls by default; a company-level key lists the whole company's.",
  params: [
    cursorParam,
    {
      key: "includeAnonymized",
      label: "Include anonymized",
      type: "boolean",
      hint: "Include calls associated with deleted users, whose details are anonymized.",
    },
    {
      key: "startedAfter",
      label: "Started after (ms since epoch)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "UTC milliseconds-since-epoch timestamp.",
    },
    {
      key: "startedBefore",
      label: "Started before (ms since epoch)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "UTC milliseconds-since-epoch timestamp.",
    },
    {
      key: "targetId",
      label: "Target ID",
      type: "string",
      hint: "Filter to one target's calls. Requires Target type to be set too.",
    },
    {
      key: "targetType",
      label: "Target type",
      type: "select",
      options: targetTypeOptions,
      hint: "Required whenever Target ID is set.",
    },
  ],
  output: [
    { key: "cursor", type: "string", label: "Next page cursor (null on the last page)" },
    { key: "items", type: "array", label: "Calls on this page" },
  ],

  execute(input, ctx) {
    return new DialpadClient(ctx).json<DialpadPage<unknown>>("/call", {
      query: {
        cursor: input.cursor,
        include_anonymized: input.includeAnonymized,
        started_after: input.startedAfter,
        started_before: input.startedBefore,
        target_id: input.targetId,
        target_type: input.targetType,
      },
    });
  },
};

export default callList;
