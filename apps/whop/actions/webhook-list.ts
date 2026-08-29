import type { ActionDefinition } from "@w6w/types";
import { requireAccountId, WhopClient, type WhopPage } from "../lib/client.ts";
import { accountIdParam, cursorParams, cursorQuery } from "../lib/params.ts";

/** `GET /webhooks` — `accountId` is required, with no default mode. */
interface Input {
  accountId?: string;
  appId?: string;
  includeAppWebhooks?: boolean;
  hasFailures?: boolean;
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description: "List the webhook endpoints configured for an account.",
  params: [
    accountIdParam,
    {
      key: "appId",
      label: "App ID",
      type: "string",
      hint: "Only webhooks attached to this app. Omit to list the account's own webhooks.",
    },
    {
      key: "includeAppWebhooks",
      label: "Include app webhooks too",
      type: "boolean",
      hint: "Also return webhooks attached to the account's apps. Cannot be combined with App ID.",
    },
    {
      key: "hasFailures",
      label: "Only currently failing",
      type: "boolean",
      hint: "Every delivery since the current failure streak began was rejected. Clears as soon " +
        "as one succeeds.",
    },
    ...cursorParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Webhooks" },
    { key: "page_info", type: "object", label: "Pagination cursors" },
  ],

  execute(input, ctx) {
    return new WhopClient(ctx).get<WhopPage<unknown>>("/webhooks", {
      account_id: requireAccountId(input.accountId, ctx),
      app_id: input.appId,
      include_app_webhooks: input.includeAppWebhooks,
      has_failures: input.hasFailures,
      ...cursorQuery(input),
    });
  },
};

export default webhookList;
