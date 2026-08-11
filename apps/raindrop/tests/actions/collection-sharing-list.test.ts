import { assert, assertEquals } from "@std/assert";
import collectionSharingList from "../../actions/collection-sharing-list.ts";
import { items, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("collection-sharing-list: reads /collection/{id}/sharing", async () => {
  const { ctx, calls } = mockCtx([
    { body: items([{ _id: 373381, email: "a@b.com", role: "viewer" }]) },
  ]);
  const out = await collectionSharingList.execute({ id: 8492393 }, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/rest/v1/collection/8492393/sharing");
  assertEquals(out.items, [{ _id: 373381, email: "a@b.com", role: "viewer" }]);
});

/**
 * The records are returned verbatim — filtering someone else's collaborator list
 * would be this app inventing a policy — so the description has to say that they
 * carry third-party email addresses.
 */
Deno.test("collection-sharing-list: the description warns the records carry emails", () => {
  assert(/email/i.test(collectionSharingList.description ?? ""), collectionSharingList.description);
});
