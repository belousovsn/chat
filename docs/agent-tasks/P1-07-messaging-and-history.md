Goal: Implement send/edit/delete/reply, history pagination, unread state, offline delivery on reconnect.
Dependencies: P0-05, P1-06.
Required requirement sections: 2.5, 2.7.1.
Allowed files: message service, routes, emitters, history queries.
Acceptance checks: chronological history loads incrementally, edits show marker, unread clears on open.
