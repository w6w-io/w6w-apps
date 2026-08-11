import type { ActionDefinition } from "@w6w/types";
import {
  EmailOctopusClient,
  type Page,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

type Input = PageInput;

/**
 * `GET /campaigns`.
 *
 * Read-only: the v2 API publishes no campaign create, update, send or schedule
 * endpoint, so this app can list and report on campaigns but not author them.
 * Each row carries the full `content.html` alongside its metadata.
 */
const listCampaigns: ActionDefinition<Input> = {
  key: "list-campaigns",
  type: "search",
  resource: "campaign",
  title: "List Campaigns",
  description:
    "Fetch one cursor page of the account's campaigns with their status (draft, sending, sent, error), recipients, sender and HTML content.",
  params: [...PAGE_PARAMS],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return new EmailOctopusClient(ctx).request<Page>("/campaigns", { query: pageQuery(input) });
  },
};

export default listCampaigns;
