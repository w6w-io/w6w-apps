import { assert, assertEquals } from "@std/assert";
import smartEmailList from "../../actions/smart-email-list.ts";
import { API_PATH, mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * The /transactional asymmetry, pinned: NO .json extension and a camelCase
 * segment. Appending .json the way every other endpoint requires would 404.
 */
Deno.test("smart-email-list: builds /transactional/smartEmail with no .json extension", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await smartEmailList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/transactional/smartEmail`);
  assert(!pathOf(calls[0].url).endsWith(".json"), "a .json extension here would 404");
});

/** Capital D in clientID, unlike every lowercase parameter elsewhere. */
Deno.test("smart-email-list: sends clientID with the vendor's capital D", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await smartEmailList.execute({ status: "active", clientId: "cid" }, ctx);
  assertEquals(queryOf(calls[0].url), { status: "active", clientID: "cid" });
});

/** A client-scoped key must not send one; the param is optional for that reason. */
Deno.test("smart-email-list: omits clientID entirely when it is not supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await smartEmailList.execute({ status: "all" }, ctx);
  assertEquals(queryOf(calls[0].url), { status: "all" });
  assertEquals(
    (smartEmailList.params ?? []).find((p) => p.key === "clientId")?.required,
    undefined,
  );
});

Deno.test("smart-email-list: returns the array of smart emails", async () => {
  const emails = [{
    ID: "fg84jd3vbask48fjh59dnfls",
    Name: "Welcome email",
    CreatedAt: "2014-01-15T16:09:19-05:00",
    Status: "Active",
  }];
  const { ctx } = mockCtx([{ body: emails }]);
  assertEquals(await smartEmailList.execute({}, ctx), emails);
});
