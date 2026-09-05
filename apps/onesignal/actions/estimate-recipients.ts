import type { ActionDefinition } from "@w6w/types";
import { compact, OneSignalClient, resolveAppId } from "../lib/client.ts";
import { buildTargeting, TARGETING_PARAMS, type TargetingInput } from "../lib/params.ts";

/**
 * `POST /notifications/count-unsaved` — estimates an audience without
 * creating or sending anything. Verified required fields: `app_id`,
 * `included_segments`. Useful before `send-push`/`send-email`/`send-sms` to
 * see how large a send would be.
 */
interface Input extends TargetingInput {
  includedSegments: string;
}

const estimateRecipients: ActionDefinition<Input> = {
  key: "estimate-recipients",
  type: "read",
  resource: "notification",
  title: "Estimate Recipients",
  description: "Preview the audience size for a targeting configuration before sending.",
  params: [
    {
      key: "includedSegments",
      label: "Included Segments",
      type: "string",
      required: true,
      hint: 'Comma-separated segment names, e.g. "Subscribed Users".',
    },
    ...TARGETING_PARAMS.filter((p) => p.key !== "includedSegments"),
  ],
  output: [
    { key: "count", type: "number", label: "Estimated recipients" },
    { key: "uncapped_count", type: "number", label: "Estimate before any plan cap" },
    { key: "cap_applied", type: "boolean", label: "Whether a plan cap reduced the estimate" },
  ],

  execute(input, ctx) {
    const appId = resolveAppId(ctx.connection);
    const body = compact({
      app_id: appId,
      ...buildTargeting(input),
    });
    return new OneSignalClient(ctx).json("/notifications/count-unsaved", {
      method: "POST",
      body,
    });
  },
};

export default estimateRecipients;
