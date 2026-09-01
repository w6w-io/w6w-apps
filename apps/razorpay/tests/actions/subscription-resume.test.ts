import { assertEquals } from "@std/assert";
import subscriptionResume from "../../actions/subscription-resume.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-resume: posts resume_at='now'", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sub_1", status: "active" } }]);
  await subscriptionResume.execute({ id: "sub_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/subscriptions/sub_1/resume");
  assertEquals(JSON.parse(calls[0].body!), { resume_at: "now" });
});
