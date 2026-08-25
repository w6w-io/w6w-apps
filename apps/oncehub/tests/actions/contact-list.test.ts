import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-list.ts";

Deno.test("contact-list: GETs /contacts with the email and date-range filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", data: [] } }]);
  await action.execute(
    { email: "a@b.com", creationTimeGt: "2026-01-01", lastUpdatedTimeLt: "2026-02-01" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/contacts");
  assertEquals(url.searchParams.get("email"), "a@b.com");
  assertEquals(url.searchParams.get("creation_time.gt"), "2026-01-01");
  assertEquals(url.searchParams.get("last_updated_time.lt"), "2026-02-01");
});
