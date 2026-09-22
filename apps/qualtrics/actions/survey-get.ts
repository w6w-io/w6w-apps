import type { ActionDefinition } from "@w6w/types";
import { encodeId, QualtricsClient } from "../lib/client.ts";
import { surveyIdParam } from "../lib/params.ts";

interface Input {
  surveyId: string;
}

/**
 * `GET /API/v3/surveys/{surveyId}` — one survey's definition and metadata.
 *
 * Confirmed live on 2026-09-22: an unauthenticated request answers `400 ATP_2`,
 * the API's own auth error, so the route exists.
 */
const surveyGet: ActionDefinition<Input> = {
  key: "survey-get",
  type: "read",
  resource: "survey",
  title: "Get Survey",
  description: "Fetch one survey by id.",
  params: [surveyIdParam],
  output: [
    { key: "id", type: "string", label: "Survey ID" },
    { key: "name", type: "string", label: "Survey name" },
    { key: "ownerId", type: "string", label: "Owner user id" },
    { key: "creationDate", type: "string", label: "Created at" },
    { key: "lastModifiedDate", type: "string", label: "Last modified at" },
    { key: "isActive", type: "boolean", label: "Active" },
  ],

  async execute(input, ctx) {
    return await new QualtricsClient(ctx).request(`/surveys/${encodeId(input.surveyId)}`);
  },
};

export default surveyGet;
