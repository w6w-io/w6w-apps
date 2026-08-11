import { assert, assertEquals } from "@std/assert";
import photoDescriptionUpdate from "../../actions/photo-description-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

/**
 * A POST to a plural path with a FLAT body — no `photo` wrapper — which is the
 * asymmetry against `photo-update` that costs a debugging session.
 */
Deno.test("photo-description-update: posts a flat description body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "9", description: "North side" } }]);
  await photoDescriptionUpdate.execute({ photoId: "9", description: "North side" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/photos/9/descriptions");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { description: "North side" });
});

Deno.test("photo-description-update: is idempotent despite the POST", () => {
  assertEquals(photoDescriptionUpdate.idempotent, true);
  const description = photoDescriptionUpdate.params!.find((p) => p.key === "description")!;
  assert(/strong/.test(description.hint!), "the allowed HTML tag list is part of the contract");
});
