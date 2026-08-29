import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient, unset } from "../lib/client.ts";
import { surveyOutput } from "../lib/params.ts";

interface Input {
  surveyId: number;
  score?: number;
  bodyText?: string;
  scoredDatetime?: string;
}

/**
 * `PUT /satisfaction-surveys/{id}` — verified against
 * developers.gorgias.com/reference/update-satisfaction-survey. Typically used
 * to record the customer's answer (`score` and `body_text`) after the survey
 * was sent.
 */
const surveyUpdate: ActionDefinition<Input> = {
  key: "survey-update",
  type: "perform",
  resource: "satisfaction-survey",
  title: "Update Satisfaction Survey",
  description: "Record or change a satisfaction survey's score and comment.",
  idempotent: true,
  params: [
    { key: "surveyId", label: "Survey ID", type: "number", required: true },
    {
      key: "score",
      label: "Score",
      type: "number",
      validation: { min: 1, max: 5, integer: true },
    },
    { key: "bodyText", label: "Comment", type: "text" },
    {
      key: "scoredDatetime",
      label: "Scored at",
      type: "datetime",
      advanced: true,
      hint: "When the customer filled in the survey. Defaults to now if left unset.",
    },
  ],
  output: surveyOutput,

  execute(input, ctx) {
    return new GorgiasClient(ctx).request(`/satisfaction-surveys/${input.surveyId}`, {
      method: "PUT",
      body: {
        score: input.score,
        body_text: unset(input.bodyText),
        scored_datetime: unset(input.scoredDatetime),
      },
    });
  },
};

export default surveyUpdate;
