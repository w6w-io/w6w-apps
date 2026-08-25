import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  fromNumber: string;
  number: string;
}

/**
 * `POST /api/request-location` — sends a Find My location request. Requires
 * a dedicated Mac-backed (V2) line; shared lines cannot initiate a request
 * (though they can still receive a location a contact shares unprompted — see
 * `location-list`/`location-get`). The request is queued like a normal
 * outbound iMessage; if accepted, the location arrives later as an inbound
 * `message_type: location` webhook, not as this call's response.
 */
const locationRequestCreate: ActionDefinition<Input> = {
  key: "location-request-create",
  type: "perform",
  resource: "location",
  title: "Request Location",
  description: "Send a Find My location request to an iMessage recipient. Requires a V2 line.",
  idempotent: false,
  params: [
    { key: "fromNumber", label: "From (V2 Sendblue number)", type: "string", required: true },
    { key: "number", label: "Recipient", type: "string", required: true },
  ],
  output: [
    { key: "message_handle", type: "string", label: "Message handle" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.post("/api/request-location", {
      from_number: input.fromNumber,
      number: input.number,
    });
  },
};

export default locationRequestCreate;
