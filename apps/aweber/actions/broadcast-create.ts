import type { ActionDefinition } from "@w6w/types";
import { AweberClient, compact, encodeId } from "../lib/client.ts";
import { accountIdParam, listIdParam } from "../lib/params.ts";

/**
 * `POST /accounts/{accountId}/lists/{listId}/broadcasts` — create a draft
 * broadcast newsletter.
 *
 * Unlike Add Subscriber or Create Custom Field (`201`, no body, only a
 * `Location` header), this one answers **`200` with the full created
 * `Broadcast` returned directly** — a third variation on "how does a create
 * endpoint tell you what it made" inside the same API. This action returns
 * that body as-is, so `broadcast_id` is read from the result rather than
 * from a header.
 *
 * `body_html` and `body_text` are both optional individually but not
 * together: if one is omitted AWeber auto-generates it from the other, and
 * at least one is required. `include_lists` / `exclude_lists` take a
 * JSON-encoded array of full list `self_link` URLs, not bare ids.
 */
interface Input {
  accountId: string;
  listId: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  clickTrackingEnabled?: boolean;
  isArchived?: boolean;
  notifyOnSend?: boolean;
  segmentLink?: string;
}

const broadcastCreate: ActionDefinition<Input> = {
  key: "broadcast-create",
  type: "perform",
  resource: "broadcast",
  title: "Create Broadcast",
  description: "Create a draft broadcast newsletter. Provide body_html and/or body_text.",
  idempotent: false,
  params: [
    accountIdParam,
    listIdParam,
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "bodyHtml",
      label: "HTML body",
      type: "code",
      hint: "Auto-generated from the text " +
        "body if omitted. At least one of HTML/text body is required.",
    },
    { key: "bodyText", label: "Text body", type: "text" },
    {
      key: "clickTrackingEnabled",
      label: "Track clicks",
      type: "boolean",
      default: true,
    },
    { key: "isArchived", label: "Shareable via archive URL", type: "boolean", default: true },
    { key: "notifyOnSend", label: "Notify when stats are ready", type: "boolean", default: true },
    {
      key: "segmentLink",
      label: "Segment self_link",
      type: "string",
      hint: 'Full self_link of a segment (see segment-list). Defaults to the "Active ' +
        'Subscribers" segment if left empty.',
    },
  ],
  output: [
    { key: "broadcast_id", type: "string", label: "New broadcast ID" },
    { key: "self_link", type: "string", label: "URL of the new broadcast" },
    { key: "status", type: "string", label: "Status (draft)" },
  ],

  execute(input, ctx) {
    return new AweberClient(ctx).json<Record<string, unknown>>(
      `/accounts/${encodeId(input.accountId)}/lists/${encodeId(input.listId)}/broadcasts`,
      {
        method: "POST",
        body: compact({
          subject: input.subject,
          body_html: input.bodyHtml,
          body_text: input.bodyText,
          click_tracking_enabled: input.clickTrackingEnabled,
          is_archived: input.isArchived,
          notify_on_send: input.notifyOnSend,
          segment_link: input.segmentLink,
        }),
      },
    );
  },
};

export default broadcastCreate;
