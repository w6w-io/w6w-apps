import type { ActionDefinition } from "@w6w/types";
import { OneSignalClient, resolveAppId } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
  kind?: number;
}

/**
 * `GET /notifications?app_id=...&limit=...&offset=...&kind=...` — verified
 * against OneSignal's OpenAPI document.
 *
 * `kind` is easy to misread as a channel filter (push/email/sms) — it is not.
 * It filters by **how the message was created**: `0` dashboard, `1` API,
 * `3` automated (Journeys and other automated systems). There is no `2`; the
 * vendor's own description skips it without explanation.
 */
const viewMessages: ActionDefinition<Input> = {
  key: "view-messages",
  type: "read",
  resource: "notification",
  title: "List Messages",
  description: "List messages sent from this app, most recent first.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 50, hint: "Max 50 per page." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    {
      key: "kind",
      label: "Created Via",
      type: "select",
      default: "",
      options: [
        { value: 0, label: "Dashboard" },
        { value: 1, label: "API" },
        { value: 3, label: "Automated (Journeys, etc.)" },
      ],
      hint: "Filters by how the message was created, not by channel. Leave blank for all.",
    },
  ],
  output: [
    { key: "total_count", type: "number", label: "Total messages" },
    { key: "notifications", type: "array", label: "Messages" },
  ],

  execute(input, ctx) {
    const appId = resolveAppId(ctx.connection);
    return new OneSignalClient(ctx).json("/notifications", {
      query: {
        app_id: appId,
        limit: input.limit ?? 50,
        offset: input.offset ?? 0,
        kind: input.kind,
      },
    });
  },
};

export default viewMessages;
