import type { ActionDefinition } from "@w6w/types";
import { buildBody, compact, LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";

interface Input {
  url: string;
  event: string;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Subscribe a URL to a Livestorm event.",
  idempotent: false,
  params: [
    { key: "url", label: "Callback URL", type: "string", required: true },
    {
      key: "event",
      label: "Event",
      type: "select",
      required: true,
      options: [
        { label: "event.published", value: "event.published" },
        { label: "event.created", value: "event.created" },
        { label: "session.started", value: "session.started" },
        { label: "session.ended", value: "session.ended" },
        { label: "session.created", value: "session.created" },
        { label: "people.registered", value: "people.registered" },
        { label: "people.attended", value: "people.attended" },
        { label: "people.not_attended", value: "people.not_attended" },
        { label: "people.watched_replay", value: "people.watched_replay" },
        { label: "job.ended", value: "job.ended" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],

  async execute(input, ctx) {
    const body = buildBody("webhooks", compact({ url: input.url, event: input.event }));
    const res = await new LivestormClient(ctx).request<JsonApiSingleResponse>("/webhooks", {
      method: "POST",
      body,
    });
    return res.data;
  },
};

export default webhookCreate;
