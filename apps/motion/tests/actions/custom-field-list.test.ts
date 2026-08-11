import { assert, assertEquals } from "@std/assert";
import customFieldList from "../../actions/custom-field-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * The prefix is the point: custom fields live under `/beta`, and there is no
 * `/v1` alias — `GET /v1/workspaces/{id}/custom-fields` is a router 404
 * (measured 2026-08-11) while this path answers 401.
 */
Deno.test("custom-field-list: calls GET /beta/workspaces/{id}/custom-fields", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: "cf1", field: "select" }, { id: "cf2", field: "number" }] },
  ]);
  const out = await customFieldList.execute({ workspaceId: "ws1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/beta/workspaces/ws1/custom-fields");
  assert(!pathOf(calls[0].url).startsWith("/v1"), "custom fields are not on /v1");
  assertEquals(out, { items: [{ id: "cf1", field: "select" }, { id: "cf2", field: "number" }] });
});

Deno.test("custom-field-list: an empty body reads as an empty list", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await customFieldList.execute({ workspaceId: "ws1" }, ctx), { items: [] });
});
