# Agent guide: make this repository run on the SOEN 343 demo platform

<!--
For students: this file is AGENTS.md in the agent kit, with an identical copy named CLAUDE.md (Claude Code reads that name).
In SweetByte this guide lives in docs/demo-platform/ (with the reference docs), not at the repository root, so it does not replace the project CLAUDE.md. Point the agent at it explicitly.
Ask your agent: "Make this project ready for the demo platform, following docs/demo-platform/AGENTS.md."
Review every change it makes. You are responsible for what you commit.
-->

You are a coding agent working in a SOEN 343 student repository.
Your task is to make the project deployable on the course's demo platform, and to explain to the team what you changed.
The platform never builds code and never reads the repository: it pulls published `linux/amd64` images and runs one compose file that it validates strictly.

Reference documents (read them; they are in the `docs/demo-platform/` folder of this repository):

- Student guide: how images are published and how the compose file must look (`docs/demo-platform/README.md`).
- Maintainer guide: the problems found in real projects and their fixes (`docs/demo-platform/DEMO-READY.md`). The step list below follows it.
- Compose policy: every rule the checker applies (`docs/demo-platform/compose-policy.md`).
- Examples: the starter-kit `compose.yaml`, `nginx.conf`, `frontend.Dockerfile` and publish workflow (`docs/demo-platform/examples/`).

## Rules

1. **Change as little student code as possible.** Prefer configuration, Dockerfiles and nginx over source edits. When a source edit is needed, make the smallest one that works both on a laptop and on the platform.
2. **Never commit secrets.** No real passwords, tokens, connection strings or API keys in code, Dockerfiles, compose files or images. If you find one already committed, do not copy it anywhere, replace it with a placeholder or a `${secret:NAME}` reference, and tell the team to rotate it.
3. **Do not invent features or rewrite the app.** If the project cannot run without a hosted service the team controls, stop at the closest honest conversion and report it.
4. **Do not run `git push`, publish packages, or change repository settings** unless the team asks you to.
5. **Do not weaken security to make a request pass.** Do not disable CSRF protection or allow every origin. Fix the forwarded headers instead (step 6).
6. **Report what you could not verify.** A build you did not run is not a build that works.

## Target

- One folder per service, each with its own `Dockerfile`, built with that folder as the context.
- One public service, usually nginx serving the frontend's production build on port 80 and proxying `/api/` to the backend. A single service that serves both pages and API is fine too.
- `demo/compose.yaml`: images only, `x-demo: { web: <service>, port: <port> }`, healthchecks, `depends_on` with `condition: service_healthy`, named volumes, demo values in `environment`.
- `.github/workflows/publish-demo-images.yml`: the workflow in `docs/demo-platform/examples/publish-demo-images.yml` with `SERVICES` set to the service folders.
- The app starts with no `.env`, no API key, an empty database, and loads its own demo data.

## Procedure

### 1. Survey

Find out, and write down before changing anything:

- Which branch has the current code. If the default branch looks like an empty skeleton, ask the team which branch to use.
- The services: frontend framework, backend framework and language version, database, any worker.
- How it runs today: existing `Dockerfile`s, `docker-compose.yml`, `vercel.json`, `firebase.json`, `render.yaml`, README instructions.
- Where the schema and the demo data come from.
- External services and keys: payments, maps, email, Supabase, Firebase, Neon.

Useful searches (exclude `node_modules`, `target`, `dist`):

```bash
grep -rn "localhost:[0-9]" --include=*.{js,jsx,ts,tsx,vue} .            # hard-coded API URLs
grep -rn "VITE_\|NEXT_PUBLIC_\|EXPO_PUBLIC_\|REACT_APP_" .               # build-time variables
grep -rln "@CrossOrigin\|CorsConfiguration\|allowedOrigins" .            # Spring CORS
grep -rn "CSRF_TRUSTED_ORIGINS\|ALLOWED_HOSTS" .                         # Django
grep -rn "spring.config.import\|@Value(\"\${[A-Z_]*}\")" .               # config that needs a value
grep -rln "supabase\|neon.tech\|firebase\|sslmode=require\|rejectUnauthorized" .
grep -rn "sk_live\|sk_test\|AIza\|password\s*[:=]" . | grep -v example     # committed secrets
git ls-files | grep -E "\.env$|\.sqlite|node_modules" | head
```

### 2. Layout

Make each service a folder with its own `Dockerfile` that builds with only that folder as context.

- Root `Dockerfile` that builds a subfolder: move it into the subfolder and fix the paths.
- Workspace lockfile at the root (pnpm, npm, Yarn): give the service its own lockfile, or build one image from the root (`SERVICES: "."`).
- Runtime folders outside the service folder (`config/`, `database/`): move them in, or build from the root.
- `"file:.."` dependencies in `package.json`: remove them if unused.
- Frontend and backend in one tree: serve the built frontend from the backend (for example `express.static("dist")` with an `index.html` fallback, or Spring's `static/`), or split the folders.
- Files the image needs must be tracked by git (`git check-ignore -v <file>` prints nothing).

### 3. Frontend

- Replace any dev server in the image with a production build behind nginx: start from `docs/demo-platform/examples/frontend.Dockerfile` and `nginx.conf`. Adjust the output folder (`dist`, `build`, `dist/<app>/browser`) and the package manager.
- Next.js: keep `next start` as its own service and put an nginx `web` service in front that proxies `/api/` to the backend and `/` to Next.
- Make every API call relative (`/api/...`). Fix the fallback in code (`|| "http://localhost:8080"` becomes `|| ""`), empty the Dockerfile `ARG` defaults, and remove hosted URLs from `.env.production`.
- If the backend has no `/api` prefix, add `rewrite ^/api/(.*)$ /$1 break;` in the nginx `location /api/` block.
- Ensure `/` serves a page.

### 4. Backend

- Listens on `0.0.0.0`.
- Starts with no `.env` file: make `spring.config.import` optional, give `@Value` placeholders defaults, read every setting from an environment variable with a demo default.
- Healthcheck: `bash -c 'echo > /dev/tcp/127.0.0.1/<port>'` on Debian/Ubuntu images; `wget -q -O /dev/null http://127.0.0.1:<port>/ || exit 1` on Alpine (no bash).
- JVM: `JAVA_TOOL_OPTIONS: -XX:MaxRAMPercentage=50`. Use a JDK image at least as new as the compiler release in `pom.xml`. If `mvnw` lacks the executable bit, run `sh ./mvnw`.

### 5. Database and data

- Add a local database service (`postgres:17` or the version the project uses) with a named volume and a `pg_isready` healthcheck, and point the backend at it with environment variables.
- The schema must come from the repository: JPA, Flyway, Liquibase, Prisma, Django migrations or a schema file. If it exists only in a hosted console, use a committed dump in a custom `db` image (`COPY schema.sql /docker-entrypoint-initdb.d/`, remove `CREATE SCHEMA public;`, healthcheck with `-h 127.0.0.1`). If there is no dump, stop and ask the team for one.
- Make SSL to the database depend on a variable; the local Postgres has none.
- The seed must run at startup and must be idempotent. If the existing seed truncates tables, run it only when the database is empty (a small wrapper script or a guard in code).
- SQLite: put the file on a named volume.

### 6. Same-origin requests behind the proxy

On the platform the browser is on `https://<group>.<demo-domain>` and the backend receives plain `http` from nginx. Spring CORS configurations and Django CSRF origin checks that list only `localhost` then refuse every POST (`403 Invalid CORS request`, `CSRF verification failed. Origin checking failed`). Fix it like this:

- In the nginx `location /api/` block, use `proxy_set_header Host $http_host;` (keeps the port for a local rehearsal) and delete any `proxy_set_header X-Forwarded-Proto ...` line. The platform edge sends `X-Forwarded-Proto/Host/Port` and nginx passes them on unchanged; overriding the proto with `$scheme` makes it `http`, and setting it without a port makes Spring drop the port in a rehearsal.
- Spring Boot: `SERVER_FORWARD_HEADERS_STRATEGY: framework` in the compose `environment`. Remove localhost-only `@CrossOrigin` annotations when the frontend is served from the same origin, or read allowed origins from an environment variable.
- Django: read `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS` from the environment, and set `SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")` and `USE_X_FORWARDED_HOST = True`.
- Express with the `cors` package needs nothing: it does not reject same-origin requests.

### 7. Keys and third-party services

- The app must start with every external key absent. Disable the feature when its key is empty.
- Server-side keys: `${secret:NAME}` in the compose file, saved by the team on the platform's Secrets page. Use this only when the app cannot run without the value.
- Browser keys (Stripe publishable, Google Maps, Firebase web config) are baked into the bundle at build time and cannot come from platform secrets. Leave them empty by default and tell the team to restrict any key they add by HTTP referrer.

### 8. Compose file and workflow

- Write `demo/compose.yaml` from `docs/demo-platform/examples/compose.yaml`. Allowed service keys are listed in the compose policy; in particular, no `build`, `ports`, `env_file`, bind mounts, `container_name`, `networks`, `restart` or resource limits.
- Values: literal demo values or `${NAME:-default}`. `$NAME` without a default becomes empty. Write `$$` for a literal `$`.
- Image lines: `ghcr.io/<owner>/<repo>-<service>:<commit SHA>`, lowercase. Until the workflow has run, use a placeholder tag and say so.
- Copy `docs/demo-platform/examples/publish-demo-images.yml` to `.github/workflows/publish-demo-images.yml` and set `SERVICES`.

### 9. Verify

Run what you can and report the result of each step:

```bash
docker build --platform linux/amd64 -t check/<service> <folder>      # every service
```

Then, after the team has published the images, rehearse as the student guide shows (`demo/compose.yaml` plus a `demo/rehearse.yaml` that publishes the public port), starting from an empty volume, and test one GET and one POST (a login) through nginx. Paste the compose file into **Check compose file** on the platform, or ask the team to.

On an Apple-silicon Mac, `linux/amd64` builds run under emulation and are slow; `./mvnw` can fail there with `tar: ... Function not implemented`. In that case let the GitHub workflow build instead.

## When to stop and ask

- The default branch does not have the code, and it is unclear which branch does.
- The schema or data exists only in a hosted service and nothing in the repository recreates it.
- The app cannot start without a credential that only the team has.
- A fix would need a large change to application logic.

## Report

End with a short report for the team:

- The services, which one is public, and the `SERVICES` value.
- Every file you changed or added, with one line on why.
- Secrets you found, and that they must be rotated.
- External keys the demo runs without, and what stops working without them.
- Demo logins.
- What you built or tested, and what you did not.

### Required final checklist

Finish your report with this checklist, exactly these lines, each marked **done** or **not done** (with the reason). Never leave a line out, and never mark a line done that you did not verify:

- `demo/compose.yaml` created: done / not done.
- `.github/workflows/publish-demo-images.yml` created with `SERVICES` set to the service folders: done / not done (give the `SERVICES` value).
- A `Dockerfile` in each service folder: done / not done (list each folder).
- Each `docker build --platform linux/amd64` run: one line per service with the command and its result (passed, failed with the error, or not run and why).
- No secrets committed: done / not done (list anything you found and must be rotated).
- What you could not verify: list it, or write "nothing".
