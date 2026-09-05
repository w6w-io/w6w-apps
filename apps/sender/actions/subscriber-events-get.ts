import type { ActionDefinition } from "@w6w/types";
import { SenderClient, toList } from "../lib/client.ts";
import { subscriberEventActionOptions, subscriberIdentifierParam } from "../lib/params.ts";

/**
 * `GET /v2/subscribers/{email}or{phone}or{ID}/events?actions=["got"]` — a
 * subscriber's event history.
 *
 * The vendor's own worked example encodes `actions` as a JSON array literal
 * inside a single query value (`?actions=["got"]`), not as repeated
 * `actions[]=` entries — so this builds that string directly rather than
 * going through the generic array-query convention `lib/client.ts` uses
 * elsewhere (see its own doc comment on that ambiguity).
 *
 * Answers a bare object keyed by channel (`email`, `sms`, `temail`, …) — no
 * `data` envelope, per the vendor's example.
 */
interface Input {
  identifier: string;
  actions?: string[] | string;
}

const subscriberEventsGet: ActionDefinition<Input> = {
  key: "subscriber-events-get",
  type: "read",
  resource: "subscriber",
  title: "Get Subscriber Events",
  description: "Get the list of actions a subscriber has performed.",
  params: [
    subscriberIdentifierParam,
    {
      key: "actions",
      label: "Actions",
      type: "multiselect",
      required: true,
      options: subscriberEventActionOptions,
    },
  ],
  output: [{ key: "email", type: "object", label: "Email events" }],

  execute(input, ctx) {
    const actions = toList(input.actions) ?? [];
    return new SenderClient(ctx).data(
      `/subscribers/${encodeURIComponent(input.identifier)}/events`,
      { query: { actions: JSON.stringify(actions) } },
    );
  },
};

export default subscriberEventsGet;
