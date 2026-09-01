import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/project-list.ts";

Deno.test("project-list: GETs /projects, turning contactId into a full resource URL", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { projects: [] } }]);
  await action.execute({ contactId: "2", view: "active" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/projects");
  assertEquals(url.searchParams.get("contact"), "https://api.freeagent.com/v2/contacts/2");
  assertEquals(url.searchParams.get("view"), "active");
});
