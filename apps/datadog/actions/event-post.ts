import type { ActionDefinition } from "@w6w/types";
import { DatadogClient, toList } from "../lib/client.ts";
import { alertTypeOptions, eventPriorityOptions } from "../lib/params.ts";

/**
 * `POST /api/v1/events` — publish an event to the Datadog event stream.
 *
 * ## Why v1 and not the newer `POST /api/v2/events`
 *
 * Because v2's event-publishing endpoint **is not on `api.<site>`**. It carries
 * a per-operation `servers` override in Datadog's OpenAPI document that swaps
 * the `api` subdomain for `event-management-intake`, so the real host is
 * `event-management-intake.datadoghq.com`. The human reference at
 * `docs.datadoghq.com/api/latest/` renders every endpoint under
 * `https://api.<site>/`, which makes this invisible unless you read the machine
 * spec — and posting to `api.<site>/api/v2/events` is a 404 that reads like a
 * typo in the path.
 *
 * `POST /api/v1/events` genuinely is on `api.<site>`, is not deprecated, and
 * needs the API key alone (`security: [{apiKeyAuth: []}]`), so it works on a
 * connection with no application key. That is the endpoint this app posts to,
 * and it is why `event-management-intake.<site>` is not in `network.allow`.
 *
 * ## Documented limits
 *
 * `title` and `text` are the only required fields. `text` is capped at 4,000
 * characters and supports markdown when wrapped in `%%%` fences.
 * `aggregation_key` is capped at 100 and groups events in the stream.
 * `date_happened` is POSIX **seconds** and is limited to events no older than
 * 18 hours. Success is `202` with `{event, status}`.
 *
 * ## Not idempotent
 *
 * There is no idempotency key. A retry posts a second event. `aggregation_key`
 * groups duplicates visually in the stream but does not deduplicate them, and a
 * monitor counting events would still see two.
 */
interface Input {
  title: string;
  text: string;
  alertType?: string;
  priority?: string;
  tags?: string;
  host?: string;
  aggregationKey?: string;
  sourceTypeName?: string;
  dateHappened?: number;
}

const eventPost: ActionDefinition<Input> = {
  key: "event-post",
  type: "perform",
  resource: "event",
  title: "Post Event",
  description: "Publish an event to the Datadog event stream.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "text",
      label: "Text",
      type: "text",
      required: true,
      hint: "Up to 4,000 characters. For markdown, start the block with `%%%` on its own line " +
        "and end it with `%%%`.",
    },
    {
      key: "alertType",
      label: "Alert type",
      type: "select",
      options: alertTypeOptions,
      hint: "Datadog treats an absent value as `info`.",
    },
    { key: "priority", label: "Priority", type: "select", options: eventPriorityOptions },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      placeholder: "env:prod,service:web",
      hint: "Comma-separated. These are how the event is found and filtered later.",
    },
    {
      key: "host",
      label: "Host",
      type: "string",
      advanced: true,
      hint: "Any tags on this host are also applied to the event.",
    },
    {
      key: "aggregationKey",
      label: "Aggregation key",
      type: "string",
      advanced: true,
      validation: { maxLength: 100 },
      hint: "Events sharing a key are grouped in the stream. It groups; it does not deduplicate.",
    },
    {
      key: "sourceTypeName",
      label: "Source type",
      type: "string",
      advanced: true,
      placeholder: "my_apps",
      hint: "One of Datadog's documented source attribute values, e.g. `jenkins`, `chef`, `git`.",
    },
    {
      key: "dateHappened",
      label: "Date happened",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0 },
      hint: "POSIX timestamp in **seconds**. Datadog rejects events older than 18 hours. " +
        "Defaults to now.",
    },
  ],
  output: [
    { key: "event", type: "object", label: "The created event" },
    { key: "status", type: "string", label: "Datadog's status string" },
  ],

  async execute(input, ctx) {
    const body: Record<string, unknown> = { title: input.title, text: input.text };
    if (input.alertType) body.alert_type = input.alertType;
    if (input.priority) body.priority = input.priority;
    if (input.host) body.host = input.host;
    if (input.aggregationKey) body.aggregation_key = input.aggregationKey;
    if (input.sourceTypeName) body.source_type_name = input.sourceTypeName;
    if (input.dateHappened !== undefined) body.date_happened = input.dateHappened;
    const tags = toList(input.tags);
    if (tags) body.tags = tags;

    const result = await new DatadogClient(ctx).json<{ event?: unknown; status?: string }>(
      "/api/v1/events",
      { method: "POST", body },
    );
    ctx.log("info", "posted event", { title: input.title });
    return { event: result?.event, status: result?.status };
  },
};

export default eventPost;
