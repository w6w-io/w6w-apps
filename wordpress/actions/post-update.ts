import type { ActionDefinition } from "@w6w/types";
import { WordPressClient } from "../lib/client.ts";

interface Input {
  postId: string;
  authorId?: number;
  title?: string;
  content?: string;
  slug?: string;
  password?: string;
  status?: string;
  commentStatus?: string;
  pingStatus?: string;
  sticky?: boolean;
  template?: string;
  categories?: number[];
  tags?: number[];
  format?: string;
  date?: string;
}

interface PostBody {
  id: number;
  author?: number;
  title?: string;
  content?: string;
  slug?: string;
  password?: string;
  status?: string;
  comment_status?: string;
  ping_status?: string;
  sticky?: boolean;
  template?: string;
  categories?: number[];
  tags?: number[];
  format?: string;
  date?: string;
}

const postUpdate: ActionDefinition<Input> = {
  key: "post-update",
  type: "perform",
  resource: "post",
  title: "Update Post",
  description: "Update fields on an existing post.",
  idempotent: true,
  params: [
    { key: "postId", label: "Post ID", type: "string", required: true },
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
    { key: "sticky", label: "Sticky", type: "boolean" },
    { key: "template", label: "Template", type: "string" },
    { key: "categories", label: "Category IDs", type: "multiselect" },
    { key: "tags", label: "Tag IDs", type: "multiselect" },
    {
      key: "format",
      label: "Format",
      type: "select",
      options: [
        { value: "aside", label: "Aside" },
        { value: "audio", label: "Audio" },
        { value: "chat", label: "Chat" },
        { value: "gallery", label: "Gallery" },
        { value: "image", label: "Image" },
        { value: "link", label: "Link" },
        { value: "quote", label: "Quote" },
        { value: "standard", label: "Standard" },
        { value: "status", label: "Status" },
        { value: "video", label: "Video" },
      ],
    },
    { key: "date", label: "Date", type: "datetime" },
  ],

  async execute(input, ctx) {
    const client = WordPressClient.fromConnection(ctx);
    const body: PostBody = { id: parseInt(input.postId, 10) };
    if (input.authorId !== undefined) body.author = input.authorId;
    if (input.title !== undefined) body.title = input.title;
    if (input.content !== undefined) body.content = input.content;
    if (input.slug !== undefined) body.slug = input.slug;
    if (input.password !== undefined) body.password = input.password;
    if (input.status !== undefined) body.status = input.status;
    if (input.commentStatus !== undefined) body.comment_status = input.commentStatus;
    if (input.pingStatus !== undefined) body.ping_status = input.pingStatus;
    if (input.sticky !== undefined) body.sticky = input.sticky;
    if (input.template !== undefined) body.template = input.template;
    if (input.categories !== undefined) body.categories = input.categories;
    if (input.tags !== undefined) body.tags = input.tags;
    if (input.format !== undefined) body.format = input.format;
    if (input.date !== undefined) body.date = input.date;
    return client.request(`/posts/${input.postId}`, { method: "POST", body });
  },
};

export default postUpdate;
