import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";
import { actAsParam } from "../lib/params.ts";

/**
 * `POST /v2/projects/{project_id}/comments` — comment on a project.
 *
 * The body nests: `{"comment": {"content": "…"}}`.
 *
 * This is one of the 14 endpoints that honour the impersonation header, and the
 * one where getting it wrong is most visible — a comment credited to the wrong
 * person is a comment the crew replies to the wrong person about.
 *
 * Not idempotent: a retry posts a second comment.
 */
interface Input {
  projectId: string;
  content: string;
  actAs?: string;
}

const projectCommentCreate: ActionDefinition<Input> = {
  key: "project-comment-create",
  type: "perform",
  resource: "comment",
  title: "Add Project Comment",
  description: "Post a comment on a project, optionally credited to another user.",
  idempotent: false,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    { key: "content", label: "Comment", type: "text", required: true },
    actAsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "creator_name", type: "string", label: "Credited to" },
    { key: "commentable_id", type: "string", label: "Project ID" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json(`/projects/${encodeId(input.projectId)}/comments`, {
      method: "POST",
      body: { comment: { content: input.content } },
      actAs: input.actAs,
    });
  },
};

export default projectCommentCreate;
