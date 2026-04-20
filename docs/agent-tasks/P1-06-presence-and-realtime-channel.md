Goal: Wire Socket.IO auth, per-tab activity heartbeats, online/AFK/offline aggregation, reconnect handling.
Dependencies: P0-04.
Required requirement sections: 2.2, 2.7.2.
Allowed files: socket server, presence service, shared realtime payloads.
Acceptance checks: online/AFK/offline transitions reflect multi-tab state within two seconds.
