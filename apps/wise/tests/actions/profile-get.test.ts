import { assertEquals } from "@std/assert";
import profileGet from "../../actions/profile-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("profile-get: GETs /profiles/{profileId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42, type: "BUSINESS" } }]);
  const out = await profileGet.execute({ profileId: 42 }, ctx) as { id: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/2026Q3/profiles/42");
  assertEquals(out.id, 42);
});

Deno.test("profile-get: requires profileId", () => {
  const p = profileGet.params?.find((p) => p.key === "profileId");
  assertEquals(p?.required, true);
});
