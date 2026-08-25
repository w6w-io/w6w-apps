// Three real, non-comment host literals for T1.2.1's `network/undeclared-host`
// pin. `w6w.network.allow` declares only `*.fixture-apex.test`, which covers a
// subdomain at any case but never the bare apex — see `hostAllowed()`.
export const SUBDOMAIN_URL = "https://sub.fixture-apex.test/v1";
export const SUBDOMAIN_URL_MIXED_CASE = "https://Sub.Fixture-Apex.Test/v1";
export const APEX_URL = "https://fixture-apex.test/v1";
