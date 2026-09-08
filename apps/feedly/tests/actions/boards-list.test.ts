import { assertEquals } from "@std/assert";
import boardsList from "../../actions/boards-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("boards-list: GETs /v3/enterprise/tags and passes the array through", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "b1", label: "API Test Board" }] }]);
  const out = await boardsList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/enterprise/tags");
  assertEquals(out, { boards: [{ id: "b1", label: "API Test Board" }] });
});

Deno.test("boards-list: an empty/undefined response becomes an empty array, not undefined", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const out = await boardsList.execute({}, ctx);
  assertEquals(out, { boards: [] });
});

Deno.test("boards-list: takes no parameters", () => {
  assertEquals(boardsList.params?.length, 0);
});
