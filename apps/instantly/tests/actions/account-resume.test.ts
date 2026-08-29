import { assertEquals } from "@std/assert";
import accountResume from "../../actions/account-resume.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-resume: POSTs /accounts/{email}/resume", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "a@b.com", status: 1 } }]);
  const out = await accountResume.execute({ email: "a@b.com" }, ctx) as { status: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/accounts/a%40b.com/resume");
  assertEquals(out.status, 1);
});
