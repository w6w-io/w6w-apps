import type { ActionDefinition } from "@w6w/types";
import { stripSecrets, VapiClient } from "../lib/client.ts";

/**
 * `GET /file` — the ONE list endpoint in this app whose `purpose` query
 * parameter is REQUIRED, unlike every other list here where every filter is
 * optional. It also has no `limit` or `createdAt`/`updatedAt` filtering of
 * any kind — omitting `purpose` is a `400`, not "list everything".
 */
interface Input {
  purpose: string;
}

const fileList: ActionDefinition<Input> = {
  key: "file-list",
  type: "search",
  resource: "file",
  title: "List Files",
  description: "List uploaded files for a given purpose. Purpose is required by the vendor API.",
  params: [
    {
      key: "purpose",
      label: "Purpose",
      type: "select",
      required: true,
      options: [
        { value: "assistant", label: "Assistant (knowledge base v1)" },
        { value: "composer-attachment", label: "Composer attachment" },
        { value: "knowledge-base-v2", label: "Knowledge base v2" },
      ],
    },
  ],
  output: [{ key: "items", type: "array", label: "Files" }],

  async execute(input, ctx) {
    const items = await new VapiClient(ctx).json<unknown[]>("/file", {
      query: { purpose: input.purpose },
    });
    return { items: stripSecrets(items) };
  },
};

export default fileList;
