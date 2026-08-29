import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient } from "../lib/client.ts";
import { surveyOutput } from "../lib/params.ts";

interface Input {
  surveyId: number;
}

/**
 * `GET /satisfaction-surveys/{id}` — verified against
 * developers.gorgias.com/reference/get-satisfaction-survey.
 */
const surveyGet: ActionDefinition<Input> = {
  key: "survey-get",
  type: "read",
  resource: "satisfaction-survey",
  title: "Get Satisfaction Survey",
  description: "Retrieve a single satisfaction survey by ID.",
  params: [
    { key: "surveyId", label: "Survey ID", type: "number", required: true },
  ],
  output: surveyOutput,

  execute(input, ctx) {
    return new GorgiasClient(ctx).request(`/satisfaction-surveys/${input.surveyId}`);
  },
};

export default surveyGet;
