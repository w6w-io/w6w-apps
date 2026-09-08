import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/mailing-list-emails-add.ts";

Deno.test("mailing-list-emails-add: POSTs a single-entry emails array with no variables key when empty", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: true } }]);
  await action.execute!({ id: 1, email: "a@b.com" }, ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/addressbooks/1/emails");
  assertEquals(JSON.parse(calls[0].body ?? ""), { emails: [{ email: "a@b.com" }] });
});

Deno.test("mailing-list-emails-add: forwards variables when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: true } }]);
  await action.execute!({ id: 1, email: "a@b.com", variables: { name: "Ada" } }, ctx);
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.emails[0].variables, { name: "Ada" });
});

Deno.test("mailing-list-emails-add: is marked idempotent — re-adding an email upserts", () => {
  assertEquals(action.idempotent, true);
});
