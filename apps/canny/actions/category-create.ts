import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { idOutput } from "../lib/output.ts";
import { boardIdParam } from "../lib/params.ts";

/**
 * `POST /v1/categories/create` — create a category (or subcategory, via
 * `parentID`) on a board.
 *
 * `subscribeAdmins` carries no "(optional)" marker in Canny's own Arguments
 * table, unlike `parentID` — it is required, so this declares it with a
 * default rather than leaving it for the caller to discover the hard way.
 * Not idempotent: repeated calls create repeated categories of the same
 * name, since Canny documents no name-based get-or-create here.
 */
interface Input {
  boardID: string;
  name: string;
  parentID?: string;
  subscribeAdmins: boolean;
}

const categoryCreate: ActionDefinition<Input> = {
  key: "category-create",
  type: "perform",
  resource: "category",
  title: "Create Category",
  description: "Create a new category, or subcategory, on a board.",
  idempotent: false,
  params: [
    boardIdParam(true),
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { minLength: 1, maxLength: 30 },
      hint: "Must be between 1 and 30 characters long.",
    },
    {
      key: "parentID",
      label: "Parent category",
      type: "string",
      hint: "The id of the parent category, to create this as a subcategory.",
    },
    {
      key: "subscribeAdmins",
      label: "Subscribe admins",
      type: "boolean",
      required: true,
      default: false,
      hint: "Whether admins should be subscribed to this category's posts.",
    },
  ],
  output: idOutput,

  execute(input, ctx) {
    return new CannyClient(ctx).post<{ id: string }>("/categories/create", {
      boardID: input.boardID,
      name: input.name,
      parentID: input.parentID,
      subscribeAdmins: input.subscribeAdmins,
    });
  },
};

export default categoryCreate;
