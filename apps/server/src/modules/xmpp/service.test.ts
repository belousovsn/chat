import assert from "node:assert/strict";
import { test } from "node:test";
import { buildXmppStatus, type XmppRuntimeConfig } from "./service.js";

const baseRuntime = (): XmppRuntimeConfig => ({
  xmppAdminJid: "xmppadmin@localhost",
  xmppAdminPort: 5443,
  xmppApiBaseUrl: "http://xmpp:5281/api",
  xmppApiPass: "secret",
  xmppApiUser: "xmppapi@localhost",
  xmppClientPort: 5222,
  xmppComposeProfile: "xmpp",
  xmppDomain: "localhost",
  xmppEnabled: true,
  xmppFederationEnabled: false,
  xmppFederationPort: 5269,
  xmppHost: "localhost"
});

test("buildXmppStatus returns disabled thin-slice guidance when xmpp is off", async () => {
  const status = await buildXmppStatus({
    ...baseRuntime(),
    xmppEnabled: false
  });

  assert.equal(status.enabled, false);
  assert.equal(status.metrics.connectedUsers, null);
  assert.match(status.warnings.join(" "), /disabled/i);
});

test("buildXmppStatus reads ejabberd metrics when api is configured", async () => {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = (async (input) => {
    const url = String(input);
    calls.push(url);

    const command = url.split("/").at(-1);
    const payload = command === "connected_users_number"
      ? 3
      : command === "incoming_s2s_number"
        ? 1
        : command === "outgoing_s2s_number"
          ? 2
          : [{
              connection: "c2s",
              ip: "127.0.0.1",
              jid: "alice@localhost/psi",
              node: "ejabberd@localhost",
              port: 5222,
              priority: 0,
              resource: "psi",
              status: "chat",
              statustext: "",
              uptime: 42
            }];

    return new Response(JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  }) as typeof fetch;

  const status = await buildXmppStatus(baseRuntime(), fetchImpl);

  assert.equal(status.metrics.connectedUsers, 3);
  assert.equal(status.metrics.incomingS2S, 1);
  assert.equal(status.metrics.outgoingS2S, 2);
  assert.equal(status.metrics.sampleSessions[0]?.jid, "alice@localhost/psi");
  assert.equal(calls.length, 4);
});
