import type { ActionDefinition } from "@w6w/types";
import { QualtricsClient } from "../lib/client.ts";
import { maxPagesParam } from "../lib/params.ts";

interface Input {
  maxPages?: number;
}

/**
 * `GET /API/v3/eventsubscriptions` — Qualtrics' webhook registrations.
 *
 * Confirmed live on 2026-09-22 (`400 ATP_2` unauthenticated, not a 404). An
 * event subscription is the vendor's own mechanism for notifying an external
 * endpoint when a survey response arrives, so this action lets a workflow
 * inspect what is already registered without a person opening the Qualtrics UI.
 */
const eventSubscriptionList: ActionDefinition<Input> = {
  key: "event-subscription-list",
  type: "search",
  resource: "event-subscription",
  title: "List Event Subscriptions",
  description: "List the account's event subscriptions (webhook registrations).",
  params: [maxPagesParam],
  output: [
    { key: "elements", type: "array", label: "Event subscriptions" },
    { key: "count", type: "number", label: "Subscriptions returned" },
    { key: "pages", type: "number", label: "Pages fetched" },
    { key: "nextPage", type: "string", label: "URL of the next page, when more results exist" },
  ],

  async execute(input, ctx) {
    const { elements, nextPage, pages } = await new QualtricsClient(ctx).list(
      "/eventsubscriptions",
      { maxPages: input.maxPages },
    );
    return { elements, count: elements.length, pages, nextPage };
  },
};

export default eventSubscriptionList;
