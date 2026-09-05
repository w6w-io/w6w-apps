import type { ActionDefinition } from "@w6w/types";
import { compact, ManusClient, type Skill, type SkillListResponse } from "../lib/client.ts";

/**
 * `GET /v2/skill.list` — available skills, optionally including one
 * project's own. Use the returned ids in `task-create`'s Enable/Force skills.
 */
interface Input {
  projectId?: string;
}

const skillList: ActionDefinition<Input, Skill[]> = {
  key: "skill-list",
  type: "read",
  resource: "skill",
  title: "List Skills",
  description: "List available skills, including a project's own when Project ID is given.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      hint: "Include this project's own skills alongside the account's global ones.",
    },
  ],
  output: [{ key: "", type: "array", label: "Skills" }],

  async execute(input, ctx) {
    const res = await new ManusClient(ctx).request<SkillListResponse>("/v2/skill.list", {
      query: compact({ project_id: input.projectId }),
    });
    return res.data;
  },
};

export default skillList;
