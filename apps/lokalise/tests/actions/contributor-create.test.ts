import { assertEquals } from "@std/assert";
import contributorCreate from "../../actions/contributor-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contributor-create: wraps contributors in the required array shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: { contributors: [{ email: "a@example.com" }], errors: [] },
  }]);
  await contributorCreate.execute(
    {
      projectId: "p1",
      contributors:
        '[{"email":"a@example.com","languages":[{"lang_iso":"en","is_writable":true}]}]',
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/contributors");
  assertEquals(JSON.parse(calls[0].body!), {
    contributors: [{ email: "a@example.com", languages: [{ lang_iso: "en", is_writable: true }] }],
  });
});

Deno.test("contributor-create: is not idempotent", () => {
  assertEquals(contributorCreate.idempotent, false);
});
