import type { ActionDefinition } from "@w6w/types";
import { ClioClient } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/** `GET /matters/{id}.json` */
interface Input {
  id: number;
  fields?: string;
}

const matterGet: ActionDefinition<Input> = {
  key: "matter-get",
  type: "read",
  resource: "matter",
  title: "Get Matter",
  description: "Fetch one matter by id.",
  params: [
    idParam("Matter ID"),
    fieldsParam(
      "id,etag,display_number,description,status,client{id,name},practice_area{id,name}," +
        "responsible_attorney{id,name},open_date,close_date,pending_date,billable",
    ),
  ],
  output: [{ key: "data", type: "object", label: "The matter" }],

  execute(input, ctx) {
    return new ClioClient(ctx).data(`/matters/${input.id}.json`, {
      query: { fields: input.fields },
    });
  },
};

export default matterGet;
