import { assert, assertEquals } from "@std/assert";
import raindropDelete from "../../actions/raindrop-delete.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("raindrop-delete: DELETEs the singular path", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  const out = await raindropDelete.execute({ raindropId: 373777232 }, ctx) as { result: boolean };

  assertEquals(pathOf(calls[0].url), "/rest/v1/raindrop/373777232");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.result, true);
});

/**
 * The same call moves a bookmark to Trash or destroys it, depending on where it
 * already is — and nothing in the request or response distinguishes the two.
 * Saying so in the description is the only thing this action can do about it,
 * which makes the wording load-bearing rather than decorative.
 */
Deno.test("raindrop-delete: the description states the Trash-then-permanent behaviour", () => {
  const description = raindropDelete.description ?? "";
  assert(/Trash/.test(description), description);
  assert(/ALREADY in Trash/i.test(description), description);
  assert(/permanent/i.test(description), description);
});

Deno.test("raindrop-delete: is idempotent", () => {
  assertEquals(raindropDelete.idempotent, true);
});
