import type { ActionDefinition } from "@w6w/types";
import { requestJson } from "../lib/client.ts";

/** `GET /company/document-categories` — the ids "Upload Document" needs for `categoryId`. */
type Input = Record<string, never>;

interface CategoryResource {
  id?: number;
  attributes?: { name?: string };
}

interface CategoriesResponse {
  data?: CategoryResource[];
}

const listDocumentCategories: ActionDefinition<Input, unknown> = {
  key: "list-document-categories",
  type: "read",
  resource: "document",
  title: "List Document Categories",
  description: "List the company's document categories. Returns the id Upload Document " +
    "needs.",
  params: [],
  output: [
    { key: "categories", type: "array", label: "Document categories" },
  ],

  async execute(_input, ctx) {
    const res = await requestJson<CategoriesResponse>(ctx, "/company/document-categories");
    const categories = (res.data ?? []).map((c) => ({ id: c.id, name: c.attributes?.name }));
    return { categories };
  },
};

export default listDocumentCategories;
