import type { ActionDefinition } from "@w6w/types";
import { QualtricsClient } from "../lib/client.ts";
import { maxPagesParam } from "../lib/params.ts";

interface Input {
  maxPages?: number;
}

/**
 * `GET /API/v3/surveys` — every survey in this account.
 *
 * Confirmed live on 2026-09-22: an unauthenticated request answers the API's own
 * `400 ATP_2` auth error, not a 404, so the route is real.
 *
 * The response carries `result.elements` and, while more results exist,
 * `result.nextPage` — a full URL this action follows verbatim (see
 * `lib/params.ts` for why that is not a param).
 */
const surveyList: ActionDefinition<Input> = {
  key: "survey-list",
  type: "search",
  resource: "survey",
  title: "List Surveys",
  description: "List the surveys in this Qualtrics account.",
  params: [maxPagesParam],
  output: [
    { key: "elements", type: "array", label: "Surveys" },
    { key: "count", type: "number", label: "Surveys returned" },
    { key: "pages", type: "number", label: "Pages fetched" },
    { key: "nextPage", type: "string", label: "URL of the next page, when more results exist" },
  ],

  async execute(input, ctx) {
    const { elements, nextPage, pages } = await new QualtricsClient(ctx).list("/surveys", {
      maxPages: input.maxPages,
    });
    return { elements, count: elements.length, pages, nextPage };
  },
};

export default surveyList;
