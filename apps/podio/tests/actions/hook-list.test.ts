import { assertEquals } from "@std/assert";
import hookList from "../../actions/hook-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const HOOKS = [
  { hook_id: 1, status: "active", type: "item.create", url: "https://example.com/a" },
  { hook_id: 2, status: "inactive", type: "item.update", url: "https://example.com/b" },
];

Deno.test("hook-list: GETs the hooks on an app or workspace", async () => {
  const { ctx, calls } = mockCtx([{ body: HOOKS }]);
  assertEquals(await hookList.execute({ refType: "app", refId: "123" }, ctx), { hooks: HOOKS });
  assertEquals(pathOf(calls[0].url), "/hook/app/123/");

  const space = mockCtx([{ body: [] }]);
  await hookList.execute({ refType: "space", refId: "7" }, space.ctx);
  assertEquals(pathOf(space.calls[0].url), "/hook/space/7/");
});

/** Podio attaches webhooks to an app or a workspace, and nothing else. */
Deno.test("hook-list: the reference vocabulary is exactly app and space", () => {
  const refType = hookList.params!.find((p) => p.key === "refType")!;
  assertEquals(refType.validation?.enum, ["app", "space"]);
});

/**
 * An unverified hook is `inactive` and delivers nothing while looking
 * well-formed. The description is where a reader finds that out.
 */
Deno.test("hook-list: the description explains what an inactive hook means", () => {
  assertEquals((hookList.description ?? "").includes("delivering nothing"), true);
});

Deno.test("hook-list: an empty body yields an empty list", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await hookList.execute({ refType: "app", refId: "1" }, ctx), { hooks: [] });
});
