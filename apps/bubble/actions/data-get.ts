import type { ActionDefinition } from "@w6w/types";
import { BubbleClient, formatTypeName } from "../lib/client.ts";
import { TYPE_PARAM, UNIQUE_ID_PARAM } from "../lib/params.ts";

interface Input {
  type: string;
  uniqueId: string;
}

interface GetResponse {
  response: Record<string, unknown>;
}

/**
 * `GET /obj/{type}/{UniqueID}` — verified against
 * `core-resources/api/the-bubble-api/the-data-api/data-api-requests`.
 *
 * Retrieve one thing by its Unique ID. Answers 404 when the Data Type is not
 * checked on in Settings → API → Data API Settings, when the record does not
 * exist, or when the app's live version has not been deployed since that
 * setting changed.
 */
const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "data-get",
  type: "read",
  resource: "data",
  title: "Get Thing",
  description: "Retrieve one record of a Data Type by its Unique ID.",
  params: [TYPE_PARAM, UNIQUE_ID_PARAM],

  async execute(input, ctx) {
    const type = formatTypeName(input.type);
    const client = new BubbleClient(ctx);
    ctx.log("info", "getting Bubble thing", { type, uniqueId: input.uniqueId });
    const body = await client.request<GetResponse>(
      `/obj/${type}/${encodeURIComponent(input.uniqueId)}`,
    );
    return body.response;
  },
};

export default action;
