import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { clientIdParam } from "../lib/params.ts";

/**
 * `GET /api/v3.3/clients/{clientid}/templates.json` — the client's templates.
 * **Client-level.**
 *
 * `TemplateID` from here is what `campaign-create-from-template` needs. The
 * `PreviewURL` and `ScreenshotURL` fields point at `preview.createsend.com`;
 * they are returned to the caller as data and are never fetched by this app, so
 * that host is deliberately absent from `w6w.network.allow`.
 */
interface Input {
  clientId: string;
}

interface TemplateSummary {
  TemplateID: string;
  Name: string;
  PreviewURL: string;
  ScreenshotURL: string;
}

const clientTemplatesGet: ActionDefinition<Input, TemplateSummary[]> = {
  key: "client-templates-get",
  type: "search",
  resource: "template",
  title: "Get Client Templates",
  description:
    "List a client's templates, each with its ID, name and public preview and screenshot URLs.",
  params: [clientIdParam],
  output: [
    { key: "TemplateID", type: "string", label: "Template ID" },
    { key: "Name", type: "string", label: "Template name" },
    { key: "PreviewURL", type: "string", label: "Public HTML preview URL" },
    { key: "ScreenshotURL", type: "string", label: "Screenshot image URL" },
  ],

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).json<TemplateSummary[]>(
      `/clients/${encodeId(input.clientId)}/templates`,
    );
  },
};

export default clientTemplatesGet;
