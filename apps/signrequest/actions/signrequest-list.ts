import type { ActionDefinition } from "@w6w/types";
import { compact, SignRequestClient } from "../lib/client.ts";
import { limitParam, pageParam } from "../lib/params.ts";

interface Input {
  who?: string;
  fromEmail?: string;
  page?: number;
  limit?: number;
}

/** `GET /signrequests/` — list SignRequests. */
const signrequestList: ActionDefinition<Input> = {
  key: "signrequest-list",
  type: "read",
  resource: "signrequest",
  title: "List SignRequests",
  description: "List SignRequests, optionally filtered by who sent them or their `who` mode.",
  params: [
    {
      key: "who",
      label: "Who",
      type: "select",
      options: [
        { value: "m", label: "Only me" },
        { value: "mo", label: "Me and others" },
        { value: "o", label: "Only others" },
      ],
    },
    { key: "fromEmail", label: "From Email", type: "string" },
    pageParam,
    limitParam,
  ],
  output: [
    { key: "count", type: "number", label: "Total result count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "previous", type: "string", label: "Previous page URL" },
    { key: "results", type: "array", label: "SignRequests" },
  ],

  execute(input, ctx) {
    return new SignRequestClient(ctx).request("/signrequests/", {
      query: compact({
        who: input.who,
        from_email: input.fromEmail,
        page: input.page,
        limit: input.limit,
      }),
    });
  },
};

export default signrequestList;
