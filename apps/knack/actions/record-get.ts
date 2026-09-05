import type { ActionDefinition } from "@w6w/types";
import { KnackClient } from "../lib/client.ts";
import { objectKeyParam, recordIdParam } from "../lib/params.ts";

/**
 * `GET /v1/objects/{object_key}/records/{record_id}` — fetch one record by id.
 *
 * `docs.knack.com/reference/retrieving-one-record`. Object-based only: this
 * app does not implement the view-based sibling route (`GET
 * /v1/pages/{scene}/views/{view}/records/{record_id}`), which needs a page/view
 * key pair and, for a login-gated view, a live user token this app has no way
 * to obtain.
 */
interface Input {
  objectKey: string;
  recordId: string;
}

const recordGet: ActionDefinition<Input> = {
  key: "record-get",
  type: "read",
  resource: "record",
  title: "Get Record",
  description: "Fetch a single record by its id.",
  params: [objectKeyParam, recordIdParam],
  output: [
    { key: "id", type: "string", label: "Record ID" },
  ],

  execute(input, ctx) {
    return new KnackClient(ctx).record(input.objectKey, input.recordId);
  },
};

export default recordGet;
