import { assertEquals } from "@std/assert";
import membershipResume from "../../actions/membership-resume.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("membership-resume: POSTs with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "mem_1", status: "active" } }]);
  await membershipResume.execute({ membershipId: "mem_1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/memberships/mem_1/resume");
  assertEquals(calls[0].body, null);
});
