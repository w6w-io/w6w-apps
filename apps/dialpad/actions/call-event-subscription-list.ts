import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, type DialpadPage, stripSignatureSecret } from "../lib/client.ts";
import { cursorParam, targetTypeOptions } from "../lib/params.ts";

/**
 * `GET /api/v2/subscriptions/call` — list call event subscriptions for the
 * company or one target.
 *
 * **Redacted.** Each subscription embeds the full `webhook` object it
 * delivers to, which carries `signature.secret` — the same finding as
 * `lib/client.ts` documents for the webhook actions. Stripped per item before
 * this action returns.
 */
interface Input {
  cursor?: string;
  targetType?: string;
  targetId?: string;
}

interface CallEventSubscription {
  webhook?: unknown;
  [key: string]: unknown;
}

const callEventSubscriptionList: ActionDefinition<Input> = {
  key: "call-event-subscription-list",
  type: "search",
  resource: "call-event-subscription",
  title: "List Call Event Subscriptions",
  description: "List call event subscriptions for the company, or for one target.",
  params: [
    cursorParam,
    {
      key: "targetType",
      label: "Target type",
      type: "select",
      options: targetTypeOptions,
    },
    {
      key: "targetId",
      label: "Target ID",
      type: "string",
    },
  ],
  output: [
    { key: "cursor", type: "string", label: "Next page cursor (null on the last page)" },
    {
      key: "items",
      type: "array",
      label: "Call event subscriptions on this page (webhook signing secret redacted)",
    },
  ],

  async execute(input, ctx) {
    const page = await new DialpadClient(ctx).json<DialpadPage<CallEventSubscription>>(
      "/subscriptions/call",
      {
        query: { cursor: input.cursor, target_type: input.targetType, target_id: input.targetId },
      },
    );
    return {
      ...page,
      items: page.items?.map((item) =>
        item.webhook ? { ...item, webhook: stripSignatureSecret(item.webhook) } : item
      ),
    };
  },
};

export default callEventSubscriptionList;
