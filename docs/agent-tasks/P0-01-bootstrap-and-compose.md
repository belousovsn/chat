Goal: Scaffold monorepo, package manifests, strict TS base, Dockerfiles, root compose, env template, placeholder app.
Dependencies: none.
Required requirement sections: 3, 7.
Allowed files: root config, compose, Dockerfiles, workspace manifests, empty app skeletons.
Acceptance checks: `docker compose up` builds app stack, `/api/health` responds healthy, Mailpit and Postgres become healthy.
