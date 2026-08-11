import { assertEquals } from "@std/assert";
import tagGet from "../../actions/tag-get.ts";
import { entityBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-get: reads GET /v1/tags/{id} and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: entityBody("tag", { id: 678, name: "General Inquiries" }) },
  ]);
  const out = await tagGet.execute({ tagId: "678" }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/v1/tags/678");
  assertEquals(out.name, "General Inquiries");
});
