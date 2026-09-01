import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeId, LokaliseClient, toList } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/**
 * `POST /projects/{project_id}/webhooks` — subscribe a URL to project events.
 *
 * Unlike Apify's Create Webhook, Lokalise documents **no idempotency key**
 * for this endpoint — every call creates a new webhook, even with identical
 * `url`/`events`. `idempotent: false` here means what it says: a runtime
 * retry duplicates the subscription, and every subsequent event fires twice.
 *
 * The response includes the webhook's `secret` (verifies the `X-Secret`
 * delivery header) — this action's result should be treated as sensitive.
 */
interface Input {
  projectId: string;
  url: string;
  events: string[];
  branch?: string;
  eventLangMap?: unknown;
}

const WEBHOOK_EVENTS = [
  "project.branch.added",
  "project.branch.deleted",
  "project.branch.merged",
  "project.contributor.added",
  "project.contributor.deleted",
  "project.deleted",
  "project.exported",
  "project.imported",
  "project.key.added",
  "project.key.comment.added",
  "project.key.modified",
  "project.keys.deleted",
  "project.language.settings_changed",
  "project.languages.added",
  "project.snapshot",
  "project.task.closed",
  "project.task.created",
  "project.task.deleted",
  "project.task.language.closed",
  "project.translation.proofread",
  "project.translation.updated",
  "team.order.completed",
  "team.order.created",
  "team.order.deleted",
];

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Subscribe a URL to project events. Not deduplicated — a retry creates a second webhook.",
  idempotent: false,
  params: [
    projectIdParam,
    { key: "url", label: "URL", type: "string", required: true },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      required: true,
      options: WEBHOOK_EVENTS.map((value) => ({ value, label: value })),
    },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      advanced: true,
      hint: "Limit delivery to one branch. Leave empty for every branch.",
    },
    {
      key: "eventLangMap",
      label: "Per-event language filter",
      type: "json",
      advanced: true,
      hint: "Array of {event, lang_iso_codes}, e.g. " +
        '[{"event":"project.translation.updated","lang_iso_codes":["en_GB"]}].',
    },
  ],
  output: [
    { key: "webhook_id", type: "string", label: "New webhook ID" },
    { key: "secret", type: "string", label: "X-Secret header value sent with each delivery" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(`/projects/${encodeId(input.projectId)}/webhooks`, {
      method: "POST",
      body: {
        url: input.url,
        events: toList(input.events),
        ...compact({
          branch: input.branch,
          event_lang_map: asOptionalJson(input.eventLangMap, "Per-event language filter"),
        }),
      },
    });
  },
};

export default webhookCreate;
