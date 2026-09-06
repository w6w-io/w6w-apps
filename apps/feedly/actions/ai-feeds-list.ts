import type { ActionDefinition } from "@w6w/types";
import { FeedlyClient } from "../lib/client.ts";

/**
 * `GET /v3/alerts` — list the enterprise team's AI Feeds.
 *
 * Verified against the "Get list of AI Feeds" reference page (fetched
 * 2026-09-06): `servers: ["https://api.feedly.com/v3/alerts"]`, path `/`.
 * "Alert" is the API's legacy internal name for what Feedly's UI and every
 * other current reference page call an "AI Feed" — the response's own
 * `enterpriseAlerts[].feedId` values look like
 * `feed/https://feedly.com/f/alert/<uuid>`, confirming it is the same
 * resource `articles-collect` calls a stream. `userAlerts` (an individual's
 * private feeds, distinct from the team's) is returned alongside and passed
 * through unchanged.
 */

const aiFeedsList: ActionDefinition<Record<string, never>> = {
  key: "ai-feeds-list",
  type: "read",
  resource: "ai-feeds",
  title: "List AI Feeds",
  description: "List the enterprise team's AI Feeds (Feedly's internal API name: \"alerts\").",
  params: [],
  output: [
    { key: "enterpriseAlerts", type: "array", label: "Team AI Feeds" },
    { key: "userAlerts", type: "array", label: "The caller's own private AI Feeds" },
  ],

  async execute(_input, ctx) {
    return await new FeedlyClient(ctx).json("/v3/alerts");
  },
};

export default aiFeedsList;
