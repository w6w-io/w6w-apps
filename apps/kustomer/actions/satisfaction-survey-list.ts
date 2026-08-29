import type { ActionDefinition } from "@w6w/types";
import { KustomerClient } from "../lib/client.ts";
import { listOutput, pagination } from "../lib/params.ts";

interface Input {
  page?: number;
  pageSize?: number;
}

/**
 * `GET /v1/satisfaction` — "Get Satisfactions", verified against the Core
 * Resources OAS. Despite the resource name, this lists the *configured CSAT
 * survey forms* (name, channel, question scale, ...), not individual
 * customer responses — confirmed from the endpoint's own response example.
 * A single response is fetched by id via `GET /v1/satisfaction-responses/{id}`,
 * which has no list counterpart in the documented paths.
 */
const satisfactionSurveyList: ActionDefinition<Input> = {
  key: "satisfaction-survey-list",
  type: "read",
  resource: "satisfaction",
  title: "List Satisfaction Surveys",
  description: "List the CSAT survey forms configured for your organization.",
  params: [...pagination],
  output: listOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).json("/satisfaction", {
      query: { page: input.page, pageSize: input.pageSize },
    });
  },
};

export default satisfactionSurveyList;
