import type { ActionDefinition } from "@w6w/types";
import { WordPressClient } from "../lib/client.ts";

interface Input {
  pageId: string;
  password?: string;
  context?: "view" | "embed" | "edit";
}

const pageGet: ActionDefinition<Input> = {
  key: "page-get",
  type: "read",
  resource: "page",
  title: "Get Page",
  description: "Retrieve a single page by ID.",
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true },
    { key: "password", label: "Password", type: "secret", hint: "For password-protected pages." },
    {
      key: "context",
      label: "Context",
      type: "select",
      options: [
        { value: "view", label: "View" },
        { value: "embed", label: "Embed" },
        { value: "edit", label: "Edit" },
      ],
    },
  ],

  async execute(input, ctx) {
    const client = WordPressClient.fromConnection(ctx);
    return client.request(`/pages/${input.pageId}`, {
      query: { password: input.password, context: input.context },
    });
  },
};

export default pageGet;
