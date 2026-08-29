import { assertEquals } from "@std/assert";
import textDelete from "../../actions/text-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * The one delete-* action in this app that is a `POST`, not a `DELETE` — the
 * vendor's docs state this consistently (both the "Call" line and the request
 * field table), unlike `delete-device`'s self-contradicting docs. See
 * `actions/text-delete.ts` for the full comparison.
 */
Deno.test("text-delete: POSTs {iden} to /v2/texts/{iden} — verified, not a copy-paste of DELETE", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await textDelete.execute({ iden: "t1" }, ctx) as { deleted: boolean };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/texts/t1");
  assertEquals(JSON.parse(calls[0].body!), { iden: "t1" });
  assertEquals(out.deleted, true);
});

Deno.test("text-delete: is declared idempotent", () => {
  assertEquals(textDelete.idempotent, true);
});
