import type { ActionDefinition } from "@w6w/types";
import { JustCallClient } from "../lib/client.ts";
import { ORDER_ASC_DESC, PAGE, PAGINATION_OUTPUT, perPage } from "../lib/params.ts";

/** `GET /v2.1/texts` — verified against `texts_list_v21`'s OpenAPI fragment, 2026-09-05. */
interface Input {
  contact_number?: string;
  from_datetime?: string;
  to_datetime?: string;
  justcall_number?: string;
  last_sms_id_fetched?: number;
  order?: string;
  page?: number;
  per_page?: number;
  sms_content?: string;
  sms_direction?: string;
  sort?: string;
}

const textList: ActionDefinition<Input> = {
  key: "text-list",
  type: "search",
  resource: "text",
  title: "List Texts",
  description: "Retrieve SMS messages linked to the account, optionally filtered.",
  params: [
    { key: "contact_number", label: "Contact number", type: "string" },
    { key: "justcall_number", label: "JustCall number", type: "string" },
    {
      key: "sms_direction",
      label: "Direction",
      type: "select",
      options: [{ label: "Incoming", value: "incoming" }, { label: "Outgoing", value: "outgoing" }],
    },
    { key: "sms_content", label: "Content contains", type: "string" },
    {
      key: "from_datetime",
      label: "From",
      type: "string",
      hint: "yyyy-mm-dd hh:mm:ss or yyyy-mm-dd.",
    },
    { key: "to_datetime", label: "To", type: "string", hint: "yyyy-mm-dd hh:mm:ss or yyyy-mm-dd." },
    {
      key: "last_sms_id_fetched",
      label: "Last SMS ID fetched",
      type: "number",
      hint: "Pair with next_page_link to avoid duplicate rows across pages.",
    },
    ORDER_ASC_DESC,
    PAGE,
    perPage(20, 100),
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: [{ label: "ID", value: "id" }, { label: "Date/time", value: "datetime" }],
    },
  ],
  output: PAGINATION_OUTPUT,

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    const { body } = await client.json("/texts", {
      query: {
        contact_number: input.contact_number,
        from_datetime: input.from_datetime,
        to_datetime: input.to_datetime,
        justcall_number: input.justcall_number,
        last_sms_id_fetched: input.last_sms_id_fetched,
        order: input.order,
        page: input.page,
        per_page: input.per_page,
        sms_content: input.sms_content,
        sms_direction: input.sms_direction,
        sort: input.sort,
      },
    });
    return body;
  },
};

export default textList;
