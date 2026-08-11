import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";

/**
 * `GET /api/v3.3/templates/{templateid}.json` — one template's details.
 * **Template-level.**
 *
 * Worth reading the sibling path carefully, because the same `/templates/`
 * prefix means two different things depending on the id you put after it:
 * `GET /templates/{templateid}.json` is this action, while
 * `POST /templates/{clientid}.json` **creates** a template. Same shape, one is a
 * template id and the other a client id. Listing a client's templates is
 * `client-templates-get` (`GET /clients/{clientid}/templates.json`).
 *
 * The `PreviewURL` and `ScreenshotURL` returned here live on
 * `preview.createsend.com`; they are handed back as data and never fetched by
 * this app, so that host stays out of `w6w.network.allow`.
 */
interface Input {
  templateId: string;
}

interface Template {
  TemplateID: string;
  Name: string;
  PreviewURL?: string;
  ScreenshotURL?: string;
}

const templateGet: ActionDefinition<Input, Template> = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get Template",
  description: "Read one template's name and its public preview and screenshot URLs.",
  params: [
    {
      key: "templateId",
      label: "Template",
      type: "string",
      required: true,
      placeholder: "5cac213cf061dd4e008de5a82b7a3621",
      hint: "The 32-character template ID, from Get Client Templates.",
    },
  ],
  output: [
    { key: "TemplateID", type: "string", label: "Template ID" },
    { key: "Name", type: "string", label: "Template name" },
    { key: "PreviewURL", type: "string", label: "Public HTML preview URL" },
    { key: "ScreenshotURL", type: "string", label: "Screenshot image URL" },
  ],

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).json<Template>(
      `/templates/${encodeId(input.templateId)}`,
    );
  },
};

export default templateGet;
