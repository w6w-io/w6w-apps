import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, compact, toList } from "../lib/client.ts";
import { webhookEventTypeOptions } from "../lib/params.ts";

/**
 * `POST /v2/webhooks` — call a URL when an Actor run or build reaches a given
 * state.
 *
 * ## The only endpoint in this app with an idempotency key
 *
 * Apify documents it plainly: "To avoid duplicating a webhook, use the
 * `idempotencyKey` parameter in the request body. Multiple calls to create a
 * webhook with the same `idempotencyKey` will only create the webhook with the
 * first call and return the existing webhook on subsequent calls."
 *
 * So this action sends `ctx.invocation.invocationId` as the key and declares
 * `idempotent: true`. A retried step returns the webhook the first attempt
 * created rather than a second copy — which matters because a duplicated webhook
 * is not a harmless duplicate, it is every downstream notification delivered
 * twice, forever, with nothing to notice it by.
 *
 * The vendor asks for "a UUID or another random string with enough entropy";
 * `invocationId` is exactly that and is stable across retries of one step, which
 * is what makes it the right key rather than a random one generated here.
 *
 * ## Exactly one condition
 *
 * `condition` names the Actor, task or run to watch. The API models it as an
 * object with three optional keys; in practice one is set. This action exposes
 * the three as separate params and refuses anything but exactly one, because the
 * failure mode of sending two is a webhook silently bound to whichever the API
 * happens to prefer.
 *
 * ## Event-type spelling
 *
 * Webhook event types use **underscores** (`ACTOR.RUN.TIMED_OUT`) where run
 * statuses use **hyphens** (`TIMED-OUT`). Same concept, two spellings, one API.
 */
interface Input {
  requestUrl: string;
  eventTypes: string[] | string;
  actorId?: string;
  taskId?: string;
  runId?: string;
  description?: string;
  payloadTemplate?: string;
  headersTemplate?: string;
  shouldInterpolateStrings?: boolean;
  doNotRetry?: boolean;
  ignoreSslErrors?: boolean;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Create a webhook that fires when an Actor run or build reaches one of the chosen states.",
  idempotent: true,
  params: [
    {
      key: "requestUrl",
      label: "Target URL",
      type: "string",
      required: true,
      hint: "Apify POSTs a JSON payload here when the webhook fires.",
    },
    {
      key: "eventTypes",
      label: "Event types",
      type: "multiselect",
      required: true,
      options: webhookEventTypeOptions,
      hint: "At least one. Note the underscores — run statuses spell the same states with hyphens.",
    },
    {
      key: "actorId",
      label: "Watch Actor",
      type: "string",
      hint: "Fire for every run of this Actor. Set exactly one of the three watch fields.",
    },
    {
      key: "taskId",
      label: "Watch task",
      type: "string",
      hint: "Fire for every run of this task. Set exactly one of the three watch fields.",
    },
    {
      key: "runId",
      label: "Watch run",
      type: "string",
      hint: "Fire for this one run only. Set exactly one of the three watch fields.",
    },
    { key: "description", label: "Description", type: "string" },
    {
      key: "payloadTemplate",
      label: "Payload template",
      type: "code",
      hint: "JSON-like template with {{variable}} placeholders. Leave empty for Apify's default " +
        "payload.",
    },
    {
      key: "headersTemplate",
      label: "Header template",
      type: "code",
      secret: true,
      hint: "JSON-like template of extra request headers, commonly used to authenticate to the " +
        "receiving service. Apify overwrites host, Content-Type and its own X-Apify-* headers.",
    },
    {
      key: "shouldInterpolateStrings",
      label: "Interpolate inside strings",
      type: "boolean",
      hint: "Expand {{variable}} placeholders that appear inside string values of the payload.",
    },
    {
      key: "doNotRetry",
      label: "Do not retry",
      type: "boolean",
      hint: "By default Apify retries a failed delivery.",
    },
    {
      key: "ignoreSslErrors",
      label: "Ignore TLS errors",
      type: "boolean",
      hint: "Only for a target with a self-signed certificate.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "requestUrl", type: "string", label: "Target URL" },
    { key: "eventTypes", type: "array", label: "Event types" },
    { key: "condition", type: "object", label: "What it watches" },
  ],

  execute(input, ctx) {
    const conditions = compact({
      actorId: input.actorId,
      actorTaskId: input.taskId,
      actorRunId: input.runId,
    });
    const named = Object.keys(conditions);
    if (named.length !== 1) {
      throw new Error(
        named.length === 0
          ? "Set exactly one of Watch Actor, Watch task or Watch run"
          : `Set exactly one of Watch Actor, Watch task or Watch run — got ${named.length}`,
      );
    }

    const eventTypes = toList(input.eventTypes);
    if (!eventTypes?.length) throw new Error("At least one event type is required");

    return new ApifyClient(ctx).data("/webhooks", {
      method: "POST",
      body: compact({
        requestUrl: input.requestUrl,
        eventTypes,
        condition: conditions,
        description: input.description,
        payloadTemplate: input.payloadTemplate,
        headersTemplate: input.headersTemplate,
        shouldInterpolateStrings: input.shouldInterpolateStrings,
        doNotRetry: input.doNotRetry,
        ignoreSslErrors: input.ignoreSslErrors,
        // See the module docs: this is what makes a retry of this step return
        // the existing webhook instead of creating a duplicate.
        idempotencyKey: ctx.invocation?.invocationId,
      }),
    });
  },
};

export default webhookCreate;
