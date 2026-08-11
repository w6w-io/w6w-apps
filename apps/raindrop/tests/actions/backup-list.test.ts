import { assert, assertEquals } from "@std/assert";
import backupList from "../../actions/backup-list.ts";
import { items, mockCtx, pathOf } from "../_helpers.ts";

/** PLURAL. `/backup` is the generate route, and it has a side effect. */
Deno.test("backup-list: reads the plural path", async () => {
  const { ctx, calls } = mockCtx([
    { body: items([{ _id: "659d42a35ffbb2eb5ae1cb86", created: "2024-01-09T12:57:07.630Z" }]) },
  ]);
  const out = await backupList.execute({}, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/rest/v1/backups");
  assertEquals(calls[0].method, "GET");
  assert(pathOf(calls[0].url).endsWith("backups"), "dropped the plural — that is the write route");
  assertEquals(out.items.length, 1);
});

Deno.test("backup-list: an account with no backups returns an empty array", async () => {
  const { ctx } = mockCtx([{ body: items([]) }]);
  assertEquals(await backupList.execute({}, ctx), { items: [] });
});
