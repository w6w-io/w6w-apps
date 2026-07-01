import type { ActionDefinition } from "@w6w/types";
import { WordPressClient } from "../lib/client.ts";

interface Input {
  pageId: string;
  authorId?: number;
  title?: string;
  content?: string;
  slug?: string;
  password?: string;
  status?: string;
  commentStatus?: string;
  pingStatus?: string;
  template?: string;
  menuOrder?: number;
  parent?: number;
  featuredMediaId?: number;
}

interface PageBody {
  id: number;
  author?: number;
  title?: string;
  content?: string;
  slug?: string;
  password?: string;
  status?: string;
  comment_status?: string;
  ping_status?: string;
  template?: string;
  menu_order?: number;
  parent?: number;
  featured_media?: number;
}

const pageUpdate: ActionDefinition<Input> = {
  key: "page-update",
  type: "perform",
  resource: "page",
  title: "Update Page",
  description: "Update fields on an existing page.",
  idempotent: true,
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true },
    { key: "authorId", label: "Author ID", type: "number" },
    { key: "title", label: "Title", type: "string" },
    { key: "content", label: "Content", type: "text" },
    { key: "slug", label: "Slug", type: "string" },
    { key: "password", label: "Password", type: "secret" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "draft", label: "Draft" },
        { value: "future", label: "Future" },
        { value: "pending", label: "Pending" },
        { value: "private", label: "Private" },
        { value: "publish", label: "Publish" },
      ],
    },
    {
      key: "commentStatus",
      label: "Comment Status",
      type: "select",
      options: [
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
      ],
    },
    {
      key: "pingStatus",
      label: "Ping Status",
      type: "select",
      options: [
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
      ],
    },
    { key: "template", label: "Template", type: "string" },
    { key: "menuOrder", label: "Menu Order", type: "number" },
    { key: "parent", label: "Parent Page ID", type: "number" },
    { key: "featuredMediaId", label: "Featured Media ID", type: "number" },
  ],

  async execute(input, ctx) {
    const client = WordPressClient.fromConnection(ctx);
    const body: PageBody = { id: parseInt(input.pageId, 10) };
    if (input.authorId !== undefined) body.author = input.authorId;
    if (input.title !== undefined) body.title = input.title;
    if (input.content !== undefined) body.content = input.content;
    if (input.slug !== undefined) body.slug = input.slug;
    if (input.password !== undefined) body.password = input.password;
    if (input.status !== undefined) body.status = input.status;
    if (input.commentStatus !== undefined) body.comment_status = input.commentStatus;
    if (input.pingStatus !== undefined) body.ping_status = input.pingStatus;
    if (input.template !== undefined) body.template = input.template;
    if (input.menuOrder !== undefined) body.menu_order = input.menuOrder;
    if (input.parent !== undefined) body.parent = input.parent;
    if (input.featuredMediaId !== undefined) body.featured_media = input.featuredMediaId;
    return client.request(`/pages/${input.pageId}`, { method: "POST", body });
  },
};

export default pageUpdate;
