import { assertEquals } from "@std/assert";
import pinSave from "../../actions/pin-save.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pin-save: POSTs /pins/{id}/save with the board fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "9", board_id: "3" } }]);
  const out = await pinSave.execute({ pinId: "9", boardId: "3" }, ctx) as { board_id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v5/pins/9/save");
  assertEquals(JSON.parse(calls[0].body!), { board_id: "3" });
  assertEquals(out.board_id, "3");
});

Deno.test("pin-save: sends an empty body when no board is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "9" } }]);
  await pinSave.execute({ pinId: "9" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("pin-save: never touches ad_account_id — Pinterest documents no such parameter here", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "9" } }]);
  await pinSave.execute({ pinId: "9" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("ad_account_id"), false);
});
