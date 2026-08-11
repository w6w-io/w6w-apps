import type { ActionDefinition } from "@w6w/types";
import { FirefliesClient, intArg } from "../lib/client.ts";

interface Input {
  transcriptId?: string;
  appId?: string;
  limit?: number;
  skip?: number;
}

/**
 * This query is the reason `intArg` exists. `graphql-api/query/apps` documents
 * `skip` and `limit` as `Int` in its Arguments table but declares them
 * `$skip: Float, $limit: Float` in its own usage example — and a GraphQL
 * variable's type must match the argument's exactly (`Int` is NOT a subtype of
 * `Float` for variable usage), so one of the two spellings is a hard client-
 * side validation error and the docs do not say which. An inlined integer
 * literal is valid input for both.
 */
function buildQuery(input: Input): string {
  const page = `${intArg("limit", input.limit)}${intArg("skip", input.skip)}`;
  return `
    query AppOutputs($appId: String, $transcriptId: String) {
      apps(app_id: $appId, transcript_id: $transcriptId${page}) {
        outputs {
          transcript_id
          user_id
          app_id
          created_at
          title
          prompt
          response
        }
      }
    }
  `;
}

const appOutputList: ActionDefinition<Input> = {
  key: "app-output-list",
  type: "read",
  resource: "ai-app",
  title: "List AI App Outputs",
  description:
    "List the outputs Fireflies AI Apps produced, for one meeting or one app. The full list behind a transcript's `apps_preview`.",
  params: [
    {
      key: "transcriptId",
      label: "Transcript ID",
      type: "string",
      row: "filter",
      hint: "All AI App outputs for this meeting.",
    },
    {
      key: "appId",
      label: "App ID",
      type: "string",
      row: "filter",
      hint: "All outputs produced by this AI App.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1, max: 10 },
      hint: "Fireflies returns 10 by default, which is also its maximum for this query.",
    },
    { key: "skip", label: "Skip", type: "number", validation: { integer: true, min: 0 } },
  ],
  output: [
    { key: "apps.outputs", type: "array", label: "AI App outputs" },
  ],

  execute(input, ctx) {
    return new FirefliesClient(ctx).query(buildQuery(input), {
      appId: input.appId,
      transcriptId: input.transcriptId,
    });
  },
};

export default appOutputList;
