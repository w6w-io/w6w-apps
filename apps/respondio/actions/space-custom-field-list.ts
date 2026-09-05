import type { ActionDefinition } from "@w6w/types";
import { compact, RespondioClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /space/custom_field` — `SpaceClient.listCustomFields` in the official SDK. */
interface Input {
  limit?: number;
  cursorId?: number;
}

const spaceCustomFieldList: ActionDefinition<Input> = {
  key: "space-custom-field-list",
  type: "read",
  resource: "space",
  title: "List Custom Fields",
  description: "List this workspace's custom fields.",
  params: [...paginationParams()],
  output: [
    { key: "items", type: "array", label: "Custom fields" },
    { key: "pagination", type: "object", label: "Pagination cursor" },
  ],

  execute(input, ctx) {
    return new RespondioClient(ctx).get(
      "/space/custom_field",
      compact({ limit: input.limit, cursorId: input.cursorId }),
    );
  },
};

export default spaceCustomFieldList;
