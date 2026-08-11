import type { ActionDefinition } from "@w6w/types";
import { buildQuery, GetResponseClient } from "../lib/client.ts";

/**
 * `GET /newsletters` — the account's newsletters.
 *
 * A newsletter in GetResponse is one broadcast send. `status` is the field that
 * matters when polling: a newsletter moves from `enqueued` through `sending` to
 * `sent`, and only the last means the send finished.
 */
interface Input {
  subject?: string;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: string;
  sortDirection?: string;
  page?: number;
  perPage?: number;
}

const newsletterList: ActionDefinition<Input> = {
  key: "newsletter-list",
  type: "search",
  resource: "newsletter",
  title: "List Newsletters",
  description: "List broadcast newsletters, with their send status.",
  params: [
    { key: "subject", label: "Subject", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "enqueued", label: "Enqueued — queued, not started" },
        { value: "sending", label: "Sending — in progress" },
        { value: "sent", label: "Sent — finished" },
      ],
      hint: "Only `sent` means the send has finished.",
    },
    { key: "createdFrom", label: "Created on or after", type: "datetime" },
    { key: "createdTo", label: "Created on or before", type: "datetime" },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "createdOn", label: "Creation date" },
        { value: "sendOn", label: "Send date" },
        { value: "subject", label: "Subject" },
      ],
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      options: [
        { value: "ASC", label: "Ascending" },
        { value: "DESC", label: "Descending" },
      ],
    },
    { key: "page", label: "Page", type: "number", validation: { integer: true, min: 1 } },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      validation: { integer: true, min: 1, max: 1000 },
    },
  ],
  output: [{ key: "[]", type: "array", label: "Newsletters" }],

  execute(input, ctx) {
    const query = buildQuery({
      query: {
        subject: input.subject,
        status: input.status,
        createdOn: { from: input.createdFrom, to: input.createdTo },
      },
      sort: input.sortBy ? { [input.sortBy]: input.sortDirection ?? "ASC" } : undefined,
      page: input.page,
      perPage: input.perPage,
    });
    return new GetResponseClient(ctx).request("/newsletters", { query });
  },
};

export default newsletterList;
