import type { ActionDefinition } from "@w6w/types";
import { compact, SignRequestClient } from "../lib/client.ts";
import { limitParam, pageParam } from "../lib/params.ts";

interface Input {
  q?: string;
  name?: string;
  status?: string;
  who?: string;
  signerEmails?: string;
  page?: number;
  limit?: number;
}

/**
 * `GET /documents-search/` — free-text search across an account's documents, returning a lighter
 * `DocumentSearchDirect` shape (autocomplete text, signer emails, extra chained documents) rather
 * than the full `Document` resource `document-get` returns.
 */
const documentSearch: ActionDefinition<Input> = {
  key: "document-search",
  type: "search",
  resource: "document",
  title: "Search Documents",
  description: "Free-text search across an account's documents.",
  params: [
    { key: "q", label: "Query", type: "string", hint: "Free-text search term." },
    { key: "name", label: "Name", type: "string" },
    { key: "status", label: "Status", type: "string" },
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
    { key: "signerEmails", label: "Signer email", type: "string" },
    pageParam,
    limitParam,
  ],
  output: [
    { key: "count", type: "number", label: "Total result count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "previous", type: "string", label: "Previous page URL" },
    { key: "results", type: "array", label: "Documents" },
  ],

  execute(input, ctx) {
    return new SignRequestClient(ctx).request("/documents-search/", {
      query: compact({
        q: input.q,
        name: input.name,
        status: input.status,
        who: input.who,
        signer_emails: input.signerEmails,
        page: input.page,
        limit: input.limit,
      }),
    });
  },
};

export default documentSearch;
