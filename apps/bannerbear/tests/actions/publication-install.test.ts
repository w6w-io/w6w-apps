import { assertEquals } from "@std/assert";
import publicationInstall from "../../actions/publication-install.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("publication-install: POST /publications/{uid}/install", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uid: "t-new", name: "Installed" } }]);
  const out = await publicationInstall.execute({ uid: "p1" }, ctx) as unknown as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/publications/p1/install");
  assertEquals(out.uid, "t-new");
});

Deno.test("publication-install: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => publicationInstall.execute({ uid: "" }, ctx));
});

Deno.test("publication-install: not idempotent", () => {
  assertEquals(publicationInstall.idempotent, false);
});
