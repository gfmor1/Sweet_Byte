# Keep your project demo-ready

This page is for the people who maintain a group's repository.
The [student guide](README.md) tells you how to publish images and submit a compose file.
This page tells you how to shape the project itself so that the conversion takes minutes, not days.

Everything here comes from converting real SOEN 343 projects for the platform.
Each section names the problem, how you notice it, and the fix.
If you use a coding agent (Claude Code, Copilot, Cursor, ...), give it [AGENTS.md](../AGENTS.md) as well.

## Contents

- [The target shape](#target-shape)
- [Checklist](#checklist)
- [Repository layout](#layout)
- [Frontend](#frontend)
- [Backend](#backend)
- [Same-origin requests: CORS and CSRF behind the proxy](#cors-csrf)
- [Database and demo data](#database)
- [Third-party services and keys](#third-party)
- [Images and healthchecks](#images)
- [Try it before you submit](#try-it)

<a id="target-shape"></a>
## The target shape

```
browser ──https──> platform edge ──> web (nginx, public, port 80)
                                       ├── /        your frontend's production build
                                       └── /api/... backend (your API, port 8080)
                                                       └── db (Postgres, named volume)
```

- One public service. Every other service is reachable only by its service name.
- Every service is one folder with its own `Dockerfile`, built from that folder.
- The app starts with no `.env` file, no hosted database, no API key, and with demo data already in it.

A single service that serves both the pages and the API (for example Spring Boot serving its own HTML, or Express serving `dist/`) is just as good. Then there is no nginx.

<a id="checklist"></a>
## Checklist

| # | Check | Section |
|---|---|---|
| 1 | The default branch (`main`) has the code you want to demo. | [Layout](#layout) |
| 2 | Each service folder builds with `docker build --platform linux/amd64 <folder>` on a fresh clone. | [Layout](#layout) |
| 3 | The frontend is a production build behind nginx, not a dev server. | [Frontend](#frontend) |
| 4 | No `localhost` URL is left in frontend code, `.env.production` or Dockerfile `ARG` defaults. | [Frontend](#frontend) |
| 5 | `/` shows a page (not a 404). | [Frontend](#frontend) |
| 6 | The backend starts with no `.env` file and no API keys. | [Backend](#backend) |
| 7 | A POST (log in, place an order) works through the public address, not only on `localhost`. | [CORS and CSRF](#cors-csrf) |
| 8 | The database schema is created from the repository (migrations or JPA), not by hand in a hosted console. | [Database](#database) |
| 9 | Demo data is loaded at startup, and running the seed twice is harmless. | [Database](#database) |
| 10 | No real password, token or connection string is committed. | [Third-party](#third-party) |
| 11 | `docker compose -f compose.yaml -f rehearse.yaml up` with only published images works from an empty volume. | [Try it](#try-it) |

<a id="layout"></a>
## Repository layout

**The code is on the default branch.**
The workflow publishes only from the default branch. A repository whose `main` holds an empty skeleton while the work lives on `phase-4` cannot be published until you merge.

**One folder, one service, one Dockerfile, and the folder is the build context.**
The workflow runs `docker build <folder>`, so the Dockerfile can only see files inside that folder. These layouts break it:

| Layout | Symptom | Fix |
|---|---|---|
| The Dockerfile sits at the repository root but builds `backend/` (written for Render or similar) | `COPY backend/...` paths, or the workflow builds the wrong thing | Move the Dockerfile into `backend/` and make its paths relative to that folder. |
| pnpm, npm or Yarn workspace: the lockfile is only at the root | `npm ci` / `pnpm install --frozen-lockfile` fails in the folder | Give each service its own lockfile, or put a single Dockerfile at the root and build `.`. |
| The backend reads `config/` or `database/` folders that sit next to it, not inside it | The image starts but cannot find its files | Move those folders inside the service folder. |
| `package.json` has a `"file:.."` dependency | `npm ci` fails: the parent is outside the build context | Remove the dependency. It is almost always an accident. |
| Frontend and backend share one `package.json` or one Maven tree (for example `.tsx` files under `src/main/java`) | There is no folder to point the workflow at for each service | Either split into `frontend/` and `backend/`, or make the backend serve the built frontend so one image is enough. |

**`.gitignore` must not hide files the image needs.**
If the image copies `database/app.sqlite` or a seed file, check that git tracks it (`git check-ignore -v <file>` prints nothing).
The CI build sees only what is committed.

**Commit clean.** Do not commit `node_modules`, `target`, `dist`, cookie files or scratch files.
Name the Docker ignore file `.dockerignore`, with the dot. `dockerignore` is silently ignored.

<a id="frontend"></a>
## Frontend

**Serve a production build.** `npm run dev`, `vite`, `ng serve` and `react-scripts start` do not belong in an image.
Use the starter-kit [`frontend.Dockerfile`](examples/frontend.Dockerfile) and [`nginx.conf`](examples/nginx.conf).
Next.js is different: it runs a server (`next start`), so nginx proxies `/` to it instead of serving files.
Expo web: `expo export --platform web`, then serve the folder with nginx.

**Call the API with a relative path.** Write `fetch("/api/orders")`, never `http://localhost:8080/api/orders`.
Keep the base URL in one constant. One project had the URL in ten files.

**Build-time variables are frozen into the bundle.** `VITE_*`, `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*` and `REACT_APP_*` are replaced when `npm run build` runs, not when the container starts. You cannot fix them from the compose file. Watch for three traps:

- A fallback to localhost: `import.meta.env.VITE_API_URL || "http://localhost:8080"`. An empty value still falls back to localhost. Make the fallback `""` (or `"/api"`) in the code.
- A Dockerfile `ARG VITE_API_URL=http://localhost:8080`. Make the default empty.
- A committed `.env.production` with a hosted URL (`VITE_API_URL=https://...onrender.com`). Vite reads it automatically during the build. Remove the line.

If your code builds URLs with `new URL(path, base)` and needs an absolute base, use `window.location.origin`.

**Have a page at `/`.** If your app starts at `/login.html`, add an `index.html` that redirects there. Otherwise the demo address shows a 404.

**Client-side routes and API paths must not collide.** If your backend serves `/login` and your React app also has a `/login` route, put the API under `/api` (best), or use the nginx `rewrite ^/api/(.*)$ /$1 break;` line from the student guide.

<a id="backend"></a>
## Backend

**Listen on `0.0.0.0`.** See the [student guide](README.md#production-build).

**Start with no `.env` file.** On the platform the only configuration is the `environment` block of the compose file. These crash at startup:

| Code | Fix |
|---|---|
| Spring `spring.config.import: file:.env.local[.properties]` | `optional:file:.env.local[.properties]` |
| Spring `@Value("${STRIPE_SECRET_KEY}")` with no default | `@Value("${STRIPE_SECRET_KEY:}")`, and disable the feature when it is empty |
| A seed script that reads `.env` and throws when the file is missing | Read environment variables, with defaults |
| A hard-coded hosted database URL in `application.properties` | `${SPRING_DATASOURCE_URL:jdbc:postgresql://db:5432/app}` |

Read every setting from an environment variable with a demo default. The compose file then only overrides what differs.

**Environment variables you set must be read.** One project set `DJANGO_CSRF_TRUSTED_ORIGINS` in its compose file, but `settings.py` never read it.

<a id="cors-csrf"></a>
## Same-origin requests: CORS and CSRF behind the proxy

This is the most common reason a demo loads but nothing can be saved.

On your laptop the browser talks to `http://localhost:5173`, the backend allows that origin, and everything works.
On the platform the browser is on `https://<your-group>.<demo-domain>`, and the request reaches your backend through two proxies (the platform edge, then your nginx) as plain `http` on port 80.
A backend that compares the browser's `Origin` header with the address it was reached on sees a mismatch and refuses the request:

- Spring: `403 Invalid CORS request` on every POST, when `@CrossOrigin(origins = "http://localhost:5173")` or a `CorsConfigurationSource` lists only localhost.
- Django: `403 CSRF verification failed. Origin checking failed`, when `CSRF_TRUSTED_ORIGINS` lists only localhost.

GET requests work, so the pages load and the bug looks like a login problem.

**Fix it in three places:**

1. **Your code.** When nginx serves the frontend and proxies `/api`, the browser makes same-origin requests and needs no CORS at all. Remove localhost-only `@CrossOrigin` annotations, or read the allowed origins from an environment variable. For Django, read `CSRF_TRUSTED_ORIGINS` and `ALLOWED_HOSTS` from the environment.
2. **Your nginx.** In `location /api/`, keep the port in `Host`, and do not set `X-Forwarded-Proto`. The platform edge already sends `X-Forwarded-Proto: https`, `X-Forwarded-Host` and `X-Forwarded-Port`, and nginx passes them on unchanged. Setting it to nginx's own `$scheme` turns it into `http`:

   ```nginx
   location /api/ {
       set $backend http://backend:8080;
       proxy_pass $backend;
       proxy_set_header Host $http_host;      # not $host: keeps :8080 in a local rehearsal
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       # no X-Forwarded-Proto line
       proxy_read_timeout 55s;
   }
   ```

3. **Your backend**, so it trusts those headers:
   - Spring Boot: `SERVER_FORWARD_HEADERS_STRATEGY: framework` in the compose `environment`.
   - Django: `SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")` and `USE_X_FORWARDED_HOST = True`.

Keep CSRF protection on. The demos of all groups share one site, so the [student guide](README.md#shared-site) explains why it matters.

<a id="database"></a>
## Database and demo data

**The schema lives in the repository.** The platform runs your database in a container that starts empty. These work: JPA/Hibernate `ddl-auto`, Flyway or Liquibase migrations, Prisma migrations, Django migrations, a `schema.sql` that the app runs at startup.
These do not: tables created by hand in the Supabase, Neon or Firebase console. If that is your case, export the schema (`pg_dump --schema-only`) into the repository and make the app or a database image run it.

A schema dump in a custom database image works too (a bind mount does not):

```dockerfile
FROM postgres:17
COPY schema.sql /docker-entrypoint-initdb.d/
```

Remove the `CREATE SCHEMA public;` line from a `pg_dump` file: the schema already exists.
Give such a database the healthcheck `pg_isready -h 127.0.0.1 -U <user>`: without `-h` it reports healthy while the init script is still running.

**Do not force SSL to the database.** A connection pool with `ssl: { rejectUnauthorized: false }` or `sslmode=require` fails against the local Postgres. Make it depend on a variable.

**Hosted database or backend-as-a-service.** A demo that depends on your Supabase, Neon or Firebase project works only while that project is up, and only if you give the platform its credentials as [group secrets](README.md#secrets-and-private-images). A local Postgres in the stack is more reliable. Firebase Auth with required email verification also means you must create and verify the demo accounts by hand.

**Seed at startup, and make it safe to run twice.** Check before inserting (`if (userRepository.count() == 0)`), or upsert.
A seed that empties the tables and reloads them on every start deletes your visitors' data at every restart and redeploy. Run it only when the database is empty.
Put the demo logins in your README.

**SQLite** works if the file is on a named volume (`dbdata:/app/data`). A file inside the image is reset at every redeploy.

<a id="third-party"></a>
## Third-party services and keys

**The demo must start without any key.** Stripe, PayPal, Google Maps and email keys are optional. With no key, hide or disable the feature and keep the rest working.
Map tiles from OpenStreetMap (Leaflet, MapLibre with OpenFreeMap) need no key at all.

**Server keys** go in [group secrets](README.md#secrets-and-private-images): write `${secret:STRIPE_SECRET_KEY}` in the compose file.

**Browser keys** (Stripe publishable key, Google Maps JavaScript key, Firebase web config) are built into the frontend bundle, so a platform secret cannot reach them, and anyone can read them in the browser. Restrict them in the provider's console (HTTP referrer `https://<your-group>.<demo-domain>/*`), and use test-mode keys only.

**Never commit a real secret.** Not in `docker-compose.yml` "so the TA can run it", not as a default in `${STRIPE_SECRET_KEY:-sk_test_...}`, not in an HTML file. A secret in git history stays there: rotate it at the provider, then remove it from the code.

<a id="images"></a>
## Images and healthchecks

- **Alpine images have no `bash`**, so the guide's `bash -c 'echo > /dev/tcp/...'` healthcheck fails on `node:*-alpine` and `nginx:*-alpine`. Use `wget` there:
  `test: ["CMD-SHELL", "wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1"]`
- **`mvnw` committed without the executable bit** fails with `permission denied`. Use `RUN sh ./mvnw ...`, or `git update-index --chmod=+x mvnw`.
- **Prisma on `*-slim` images** needs `openssl` (`apt-get install -y openssl`). The `prisma` CLI and `tsx` are dev dependencies; keep them if you run migrations at startup.
- **Java target version.** Use a JDK base image at least as new as `maven.compiler.release` (or `source`/`target`) in your `pom.xml`.
- **Memory.** The whole group has 2 GB. Set `JAVA_TOOL_OPTIONS: -XX:MaxRAMPercentage=50` for every JVM.

<a id="try-it"></a>
## Try it before you submit

1. Clone your repository into a new folder (so nothing ignored by git is there) and run `docker build --platform linux/amd64 <folder>` for each service.
2. Push to `main` and let the [publish workflow](README.md#publish-images) build the images.
3. Rehearse with only the published images and an empty volume, as the [student guide](README.md#rehearse) shows. Log in and do one action that writes data (a POST).
4. Paste the compose file in **Check compose file** on the platform.
