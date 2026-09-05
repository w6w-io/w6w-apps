import type { ActionDefinition } from "@w6w/types";
import { AweberClient, compact, encodeId } from "../lib/client.ts";
import { accountIdParam, broadcastIdParam, listIdParam } from "../lib/params.ts";

/**
 * `PUT /accounts/{accountId}/lists/{listId}/broadcasts/{broadcastId}` —
 * replace a draft broadcast's details. Answers a plain `200` with the
 * updated `Broadcast` body — unlike the subscriber/custom-field `PATCH`
 * endpoints, this one does **not** use the non-standard `209` status.
 *
 * AWeber's own caveat: "only broadcast drafts created by the API are
 * available to update" — a draft started in the AWeber web UI cannot be
 * edited through this endpoint, and will 404 or 409 instead.
 */
interface Input {
  accountId: string;
  listId: string;
  broadcastId: string;
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  clickTrackingEnabled?: boolean;
}

const broadcastUpdate: ActionDefinition<Input> = {
  key: "broadcast-update",
  type: "perform",
  resource: "broadcast",
  title: "Update Broadcast",
  description: "Replace a draft broadcast's subject or body. API-created drafts only.",
  idempotent: true,
  params: [
    accountIdParam,
    listIdParam,
    broadcastIdParam,
    { key: "subject", label: "Subject", type: "string" },
    { key: "bodyHtml", label: "HTML body", type: "code" },
    { key: "bodyText", label: "Text body", type: "text" },
    { key: "clickTrackingEnabled", label: "Track clicks", type: "boolean" },
  ],
  output: [
    { key: "broadcast_id", type: "string", label: "Broadcast ID" },
    { key: "subject", type: "string", label: "Subject" },
  ],

  execute(input, ctx) {
    const { accountId, listId, broadcastId } = input;
    return new AweberClient(ctx).json<Record<string, unknown>>(
      `/accounts/${encodeId(accountId)}/lists/${encodeId(listId)}/broadcasts/${
        encodeId(broadcastId)
      }`,
      {
        method: "PUT",
        body: compact({
          subject: input.subject,
          body_html: input.bodyHtml,
          body_text: input.bodyText,
          click_tracking_enabled: input.clickTrackingEnabled,
        }),
      },
    );
  },
};

export default broadcastUpdate;
