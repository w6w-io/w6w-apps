import type { ActionDefinition } from "@w6w/types";
import { ClioClient } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/**
 * `GET /activities/{id}.json`
 *
 * **`quantity`'s unit changed between API minor versions, and this app has no
 * way to know which one answered.** The OpenAPI document's own field
 * description, verbatim: "Version <= 4.0.3: The number of HOURS the
 * TimeEntry took. Latest version: The number of SECONDS the TimeEntry took."
 * The version actually used is whatever `X-API-VERSION` the request carries
 * (or the account's own default when it is omitted) and comes back in the
 * response's own `X-API-VERSION` header — this app does not pin a version, so
 * treat `quantity` as SECONDS (the current default) and, if a workflow reads
 * unexpectedly large or fractional durations, check that header before
 * assuming a data problem.
 */
interface Input {
  id: number;
  fields?: string;
}

const activityGet: ActionDefinition<Input> = {
  key: "activity-get",
  type: "read",
  resource: "activity",
  title: "Get Activity",
  description: "Fetch one time/expense/cost entry by id.",
  params: [
    idParam("Activity ID"),
    fieldsParam(
      "id,etag,type,date,quantity,price,total,note,non_billable,matter{id,display_number}," +
        "user{id,name},activity_description{id,name}",
    ),
  ],
  output: [{ key: "data", type: "object", label: "The activity" }],

  execute(input, ctx) {
    return new ClioClient(ctx).data(`/activities/${input.id}.json`, {
      query: { fields: input.fields },
    });
  },
};

export default activityGet;
