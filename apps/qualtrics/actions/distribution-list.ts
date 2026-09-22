import type { ActionDefinition } from "@w6w/types";
import { QualtricsClient } from "../lib/client.ts";
import { maxPagesParam, surveyIdParam } from "../lib/params.ts";

interface Input {
  surveyId: string;
  maxPages?: number;
}

/**
 * `GET /API/v3/distributions?surveyId={surveyId}` — a survey's distributions.
 *
 * Confirmed live on 2026-09-22 (`400 ATP_2` unauthenticated, not a 404). The
 * route exists; Qualtrics' public docs additionally require the `surveyId`
 * query parameter, which an unauthenticated probe cannot prove — so it is
 * passed straight through as a documented requirement rather than a verified
 * one.
 */
const distributionList: ActionDefinition<Input> = {
  key: "distribution-list",
  type: "search",
  resource: "distribution",
  title: "List Distributions",
  description: "List the distributions that have been sent for one survey.",
  params: [surveyIdParam, maxPagesParam],
  output: [
    { key: "elements", type: "array", label: "Distributions" },
    { key: "count", type: "number", label: "Distributions returned" },
    { key: "pages", type: "number", label: "Pages fetched" },
    { key: "nextPage", type: "string", label: "URL of the next page, when more results exist" },
  ],

  async execute(input, ctx) {
    const { elements, nextPage, pages } = await new QualtricsClient(ctx).list("/distributions", {
      query: { surveyId: input.surveyId },
      maxPages: input.maxPages,
    });
    return { elements, count: elements.length, pages, nextPage };
  },
};

export default distributionList;
