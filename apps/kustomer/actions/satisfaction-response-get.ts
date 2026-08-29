import type { ActionDefinition } from "@w6w/types";
import { KustomerClient } from "../lib/client.ts";
import { recordOutput } from "../lib/params.ts";

interface Input {
  id: string;
}

/**
 * `GET /v1/satisfaction-responses/{id}` — verified against the Core
 * Resources OAS. There is no documented list endpoint for responses; look
 * one up via a conversation's own data, or by the id Kustomer assigns when
 * a survey response is recorded.
 */
const satisfactionResponseGet: ActionDefinition<Input> = {
  key: "satisfaction-response-get",
  type: "read",
  resource: "satisfaction",
  title: "Get Satisfaction Response",
  description: "Fetch one customer's CSAT survey response by its Kustomer ID.",
  params: [{ key: "id", label: "Satisfaction Response ID", type: "string", required: true }],
  output: recordOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).data(`/satisfaction-responses/${encodeURIComponent(input.id)}`);
  },
};

export default satisfactionResponseGet;
