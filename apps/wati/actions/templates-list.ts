import type { ActionDefinition } from "@w6w/types";
import { compact, WatiClient } from "../lib/client.ts";
import { PAGE_NUMBER_PARAM, PAGE_SIZE_PARAM } from "../lib/params.ts";

interface Input {
  channel?: string;
  pageNumber: number;
  pageSize: number;
}

interface MessageTemplateDto {
  id?: string;
  name?: string;
  category?: string;
  status?: string;
  type?: string;
  body?: string;
  language_option?: { key?: string; value?: string; text?: string };
}

interface GetMessageTemplatesResponse {
  templates?: MessageTemplateDto[];
  page_number: number;
  page_size: number;
  total?: number;
}

/**
 * `GET /api/ext/v3/messageTemplates` — verified against the embedded OpenAPI document
 * 2026-09-05. `channel` is optional (name or phone number of the sending channel; omit for the
 * default channel).
 */
const action: ActionDefinition<Input, GetMessageTemplatesResponse> = {
  key: "templates-list",
  type: "read",
  resource: "templates",
  title: "List Message Templates",
  description: "List approved WhatsApp message templates, paginated.",
  params: [
    {
      key: "channel",
      label: "Channel",
      type: "string",
      hint: "Name or phone number of the channel. Omit for the default channel.",
    },
    PAGE_NUMBER_PARAM,
    PAGE_SIZE_PARAM,
  ],
  output: [
    { key: "templates", label: "Templates", type: "array" },
    { key: "page_number", label: "Page Number", type: "number" },
    { key: "page_size", label: "Page Size", type: "number" },
    { key: "total", label: "Total", type: "number" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "listing Wati message templates");
    return await new WatiClient(ctx).get<GetMessageTemplatesResponse>(
      "/messageTemplates",
      compact({ channel: input.channel, page_number: input.pageNumber, page_size: input.pageSize }),
    );
  },
};

export default action;
