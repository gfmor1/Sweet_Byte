# Student guide: from `docker compose up` to a live demo

This guide takes your group from a project that runs on your laptop with `docker compose up --build` to a demo that your classmates can open at `https://<your-group>.<demo-domain>`.
It is written for students, but TAs use it too, so they can help any group.

**Not sure where to start? [Choose your route](/guide/start/).** This page is the full reference; each route has its own short page.

You do not need to learn anything new about Docker.
You need to do four things:

1. Build your images on GitHub, not on the platform. A ready-made workflow does it.
2. Write one compose file that uses those images, and mark which service is public.
3. Serve your frontend as a production build behind nginx, so the browser talks to one address.
4. Check the file with the platform's checker, then submit it.

**The platform never builds your code and never reads your repository.** It reads one compose file and pulls images that you published.

## Contents

- [The short version](#short-version)
- [Step 1: publish your images with GitHub Actions](#publish-images)
- [Step 2: make the packages public (or use a token)](#make-packages-public)
- [Building images from your laptop](#building-images)
- [Step 3: convert your compose file](#convert-compose)
- [Keys that are dropped or rejected](#dropped-and-rejected-keys)
- [One public address: the `/api` proxy](#public-entry-point)
- [Serve a production build, listen on 0.0.0.0](#production-build)
- [Configuration values and secrets](#configuration)
- [Secrets and private images](#secrets-and-private-images)
- [Limits you run under](#limits)
- [Several demos share one site (CSRF)](#shared-site)
- [Data in a demo](#data)
- [Step 4: rehearse, check, submit](#rehearse)
- [Errors about the file itself](#compose-file-shape)
- [FAQ](#faq)

<a id="short-version"></a>
## The short version

| You have | You need |
|---|---|
| `build: ./backend` in your compose file | `image: ghcr.io/<owner>/<repo>-backend:<commit>` (the workflow prints this line) |
| Several `ports:` | One line: `x-demo: { web: <service>, port: <port> }` |
| The Vite or React dev server | nginx serving the production build, with `/api` proxied to the backend |
| `http://localhost:8080` in frontend code | `/api` (same address as the page) |
| A `.env` file | Values written in the compose file, or `${NAME:-default}` |
| Data you typed in by hand | A seed that runs at startup |

The `starter-kit` folder of the platform repository has a complete example: `compose.yaml`, `nginx.conf`, `frontend.Dockerfile` and the workflow.
All four files are also shown in this guide.

<a id="publish-images"></a>
## Step 1: publish your images with GitHub Actions

GitHub builds your images for you, for the right CPU type (`linux/amd64`, what the platform runs), and stores them in GHCR (GitHub's container registry).
You do not install anything and you do not need a password or token.

1. In your group's repository, create the file `.github/workflows/publish-demo-images.yml` and paste the workflow below.
2. Edit `SERVICES`: list the folders that have a `Dockerfile`, separated by spaces. For example `backend frontend`, or `server client`. Change `COMPOSE_FILE` only if your compose file is not at `demo/compose.yaml`. The first run works before that file exists: it only needs `SERVICES`.
3. Commit and push to your default branch (usually `main`). Pushing starts the workflow by itself; you do not start it.
4. When it finishes (a few minutes), open the **Actions** tab on GitHub, click that run, then its **Summary**. It prints the exact `image:` lines to paste into your compose file. The Actions tab is only where you read the result.

Each image is named `ghcr.io/<owner>/<repo>-<folder>:<commit SHA>`.
The tag is the commit, so the image never changes after it is pushed. When you change your code, push again and paste the new lines.

Before it builds, a first job stops with a clear message if `demo/compose.yaml` has `build` or `env_file`, if a folder in `SERVICES` has no `Dockerfile`, or if `.env` or `.env.local` is committed. It only warns when `demo/compose.yaml` does not exist yet, when it has `ports` (the platform drops it; the public port comes from `x-demo`), when another `.env.*` file is committed, or when an image tag is a placeholder, because the compose file and the real tag come after the first run. Put your compose file at `demo/compose.yaml` (the check reads `COMPOSE_FILE` at the top of the workflow, which you can change).

The workflow runs on its own on every push to the default branch and on tags. A push to another branch shows a grey, skipped run: that is normal. The **Run workflow** button in the Actions tab only runs it again on the default branch. The workflow uses only the token GitHub gives every run (`packages: write` and `contents: read`).
You add no secrets, and you never give the platform access to your repository.

```yaml
# Publishes the Docker images of your demo to GHCR (GitHub's container registry).
#
# How to use it (details in starter-kit/README.md):
#   1. Copy this file to .github/workflows/publish-demo-images.yml in your repository.
#   2. Edit SERVICES below: one folder per image, each with its own Dockerfile.
#      COMPOSE_FILE is where your compose file lives (demo/compose.yaml is recommended).
#   3. Push to the default branch. Open the run's summary: it prints the `image:` lines to paste
#      into your compose file.
#   4. The first time, GHCR makes each package private. Public is the simplest for the platform;
#      a private package also works if your group adds a read-only token on the platform
#      (see "Secrets and private images" in the guide). To make it public: Your profile or
#      organization > Packages > the package > Package settings > Change visibility > Public.
#
# Each image is built for linux/amd64 (the platform's architecture) and named
#   ghcr.io/<owner>/<repo>-<service>:<commit SHA>
# The tag is the commit SHA, so an image never changes after it is pushed.
# Before building, a first job ("check") fails the run with a clear message if demo/compose.yaml
# uses build or env_file, if a folder in SERVICES has no Dockerfile, or if .env or .env.local is
# committed. A missing compose file, ports, another .env.* file or a placeholder image tag only
# warns, because the compose file and the real tag come after the first run. The platform's "Check compose file" page stays the complete check.
# It needs no secrets: it uses the token that GitHub gives every workflow run. That token is for
# pushing only. The platform needs its own read-only token to pull a private package.

name: Publish demo images

on:
  push:
    branches: ["**"]
    tags: ["**"]
  workflow_dispatch:

env:
  # EDIT THIS: the folders to build, separated by spaces. The last part of the folder name is the
  # service name (backend -> ghcr.io/<owner>/<repo>-backend). Use `.` for a repository whose
  # Dockerfile is at the top level (the service is then called "app").
  SERVICES: "backend frontend"
  # Your compose file. Change it only if your group keeps it somewhere else.
  COMPOSE_FILE: demo/compose.yaml

permissions:
  contents: read
  packages: write

jobs:
  check:
    # Same condition as publish, so a work-in-progress branch is not checked either.
    if: github.ref_type == 'tag' || github.ref_name == github.event.repository.default_branch
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - name: Check the compose file and the service folders
        run: |
          set -u
          compose="${COMPOSE_FILE:-demo/compose.yaml}"
          failed=0
          fail() { echo "::error::$*"; failed=1; }
          warn() { echo "::warning::$*"; }
          scan="${RUNNER_TEMP:-/tmp}/compose-scan.txt"
          : > "$scan"
          if [ ! -f "$compose" ]; then
            warn "$compose does not exist yet. That is fine for the first run: images are built either way. Write demo/compose.yaml in Step 3 and keep placeholder image lines until this run prints the real ones."
          else
            # Service keys and image values, from the lines of the services: section.
            awk '
              { sub(/\r$/, "") }
              /^[ \t]*(#.*)?$/ { next }
              { match($0, /^ */); indent = RLENGTH }
              indent == 0 { in_services = ($0 ~ /^services:/); next }
              !in_services { next }
              svc_indent == "" { svc_indent = indent }
              indent == svc_indent { svc = $1; sub(/:.*/, "", svc); key_indent = ""; next }
              key_indent == "" { key_indent = indent }
              indent == key_indent {
                key = $1; sub(/:.*/, "", key)
                if (key == "build" || key == "ports" || key == "env_file")
                  printf "BAD %d %s %s\n", NR, svc, key
                if (key == "image") {
                  v = $0; sub(/^[^:]*:[ \t]*/, "", v); sub(/[ \t]+#.*$/, "", v); gsub(/["\047]/, "", v)
                  printf "IMAGE %d %s %s\n", NR, svc, v
                }
              }
            ' "$compose" > "$scan"
            while read -r kind line svc value; do
              case "$kind" in
                BAD)
                  case "$value" in
                    build) fail "$compose line $line: service '$svc' has 'build:'. The platform rejects it. Use 'image:' with the line the workflow prints in its summary." ;;
                    env_file) fail "$compose line $line: service '$svc' has 'env_file:'. The platform rejects it. Put the values in 'environment:', or use the platform's Secrets page for secrets." ;;
                    ports) warn "$compose line $line: service '$svc' has 'ports:'. The platform drops it; the public port comes from x-demo. Remove it (use a separate rehearse file on your laptop)." ;;
                  esac
                  ;;
                IMAGE)
                  lower="$(echo "$value" | tr '[:upper:]' '[:lower:]')"
                  tag=""
                  case "${value##*/}" in *:*) tag="${value##*:}" ;; esac
                  ltag="$(echo "$tag" | tr '[:upper:]' '[:lower:]')"
                  case "$lower:$ltag" in
                    *"<"*|*">"*|*your-team*|*your-repo*|*:*todo*|*:*placeholder*|*:*changeme*|*:0123456789abcdef*)
                      warn "$compose line $line: image of '$svc' looks like a placeholder ($value). Paste the image line this workflow prints, then push again." ;;
                    ghcr.io/*)
                      if [ -z "$tag" ] || [ "$tag" = "latest" ]; then
                        warn "$compose line $line: image of '$svc' has no fixed tag ($value). Use the commit SHA tag the workflow prints."
                      fi ;;
                  esac
                  ;;
              esac
            done < "$scan"
          fi
          for dir in $SERVICES; do
            if [ ! -f "$dir/Dockerfile" ]; then
              fail "SERVICES lists '$dir' but $dir/Dockerfile does not exist. Fix SERVICES or add the Dockerfile."
            fi
          done
          # Tracked .env files: .env and .env.local are secrets; other .env.* only warn.
          for f in $(git ls-files | grep -E '(^|/)\.env(\.[^/]*)?$' | grep -Ev '\.(example|sample|template)$' || true); do
            case "${f##*/}" in
              .env|.env.local) fail "A .env file is committed: $f. Remove it from git (git rm --cached) and rotate any secret in it." ;;
              *) warn "$f is committed. Make sure it holds no secret; the platform does not read it." ;;
            esac
          done
          exit "$failed"

  publish:
    needs: check
    # Only the default branch and tags publish, so a work-in-progress branch does not.
    if: github.ref_type == 'tag' || github.ref_name == github.event.repository.default_branch
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - uses: docker/setup-buildx-action@6524bf65af31da8d45b59e8c27de4bd072b392f5 # v3.8.0

      - uses: docker/login-action@9780b0c442fbb1117ed29e0efdff1e18412f7567 # v3.3.0
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push every service
        env:
          OWNER: ${{ github.repository_owner }}
          REPO: ${{ github.event.repository.name }}
          SHA: ${{ github.sha }}
          REPOSITORY: ${{ github.repository }}
        run: |
          set -euo pipefail
          owner="${OWNER,,}"
          repo="${REPO,,}"
          {
            echo "### Images for your compose file"
            echo
            echo "Paste each line as the \`image:\` of the matching service."
            echo
            echo '```yaml'
          } >> "$GITHUB_STEP_SUMMARY"
          for dir in $SERVICES; do
            name="$(basename "$(realpath "$dir")")"
            [ "$dir" = "." ] && name="app"
            name="$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9\n-' '-')"
            image="ghcr.io/${owner}/${repo}-${name}:${SHA}"
            echo "::group::Build ${image}"
            docker buildx build \
              --platform linux/amd64 \
              --provenance=false \
              --label "org.opencontainers.image.source=https://github.com/${REPOSITORY}" \
              --tag "$image" \
              --push \
              "$dir"
            echo "::endgroup::"
            echo "# ${dir}" >> "$GITHUB_STEP_SUMMARY"
            echo "image: ${image}" >> "$GITHUB_STEP_SUMMARY"
          done
          echo '```' >> "$GITHUB_STEP_SUMMARY"
          echo "Public packages work as they are. For a private package, add a read-only token on the platform (guide: Secrets and private images)." >> "$GITHUB_STEP_SUMMARY"
```

If a run fails, open it and read the red step. The usual causes are a wrong folder name in `SERVICES`, a `Dockerfile` that does not build (try `docker build` on your laptop), or an organization that blocks workflows from publishing packages (ask the instructor).

<a id="make-packages-public"></a>
## Step 2: make the packages public (or use a token)

The first time, GHCR makes every package **private**. Public is still the simplest path, because it needs nothing more. A private package also works if your group stores a read-only token on the platform: see [Secrets and private images](#secrets-and-private-images). To make a package public:

1. On your repository's main page, the right column has a **Packages** box. Click the package (there is one per service; "+ N packages" shows the rest). If the box is missing, open your GitHub profile or organization, then its **Packages** tab.

    ![The repository main page, with the Packages box in the right column highlighted](/static/guide/packages-sidebar.png)

2. On the package page, click **Package settings** at the bottom of the right column.

    ![The package page, with the Package settings link at the bottom of the right column highlighted](/static/guide/package-settings.png)

3. At the bottom, in the **Danger Zone**, click **Change visibility**, choose **Public** and confirm by typing the package name.

    ![The Danger Zone of the package settings, with the Change visibility button highlighted](/static/guide/change-visibility.png)

Do this once for every package. Later pushes keep the setting.
You can check from any computer that is not signed in to GitHub: `docker pull ghcr.io/<owner>/<repo>-backend:<commit>` must work.

Public means anyone can download the image. **Never put passwords, API keys or private data inside an image.**
If a package is private and your group has no token for `ghcr.io`, the platform rejects the image with "it does not exist, or is private". Either make it public or add a token.

<a id="building-images"></a>
## Building images from your laptop

Use this only if GitHub Actions does not work for your group.

### From your laptop

The platform runs `linux/amd64`. Intel and Windows laptops build that by default. **Apple-silicon Macs (M1, M2, M3, M4) build `linux/arm64` by default, which the platform rejects**, so always pass `--platform linux/amd64`.

```bash
# 1. Sign in to GHCR. The password is a GitHub personal access token (classic) with the
#    "write:packages" permission: GitHub > Settings > Developer settings > Tokens (classic).
echo "$GITHUB_TOKEN" | docker login ghcr.io -u <your-github-username> --password-stdin

# 2. Build for linux/amd64 and push, one command per service (names must be lowercase).
docker buildx build --platform linux/amd64 \
  -t ghcr.io/<owner>/<repo>-backend:v1 --push ./backend

# 3. Check what was pushed. It must list linux/amd64.
docker buildx imagetools inspect ghcr.io/<owner>/<repo>-backend:v1
```

Then make the package public (Step 2). Use a new tag (`v2`, `v3`, ...) for every push. Reusing a tag works, but a new tag is easier to follow.

Building `linux/amd64` on an Apple-silicon Mac runs the build under emulation, so it is slower, and a few tools fail there. For example, the Maven wrapper (`./mvnw`) can stop with `tar: ... Cannot open: Function not implemented` while unpacking Maven. If that happens, use GitHub Actions (Step 1), which builds on real `amd64` machines, or [ask a TA](/guide/route-c/).

If you see `exec format error` when running an image on the platform, or the submission page says the image "provides only linux/arm64", the image was built without `--platform linux/amd64`.

<a id="convert-compose"></a>
## Step 3: convert your compose file

Your local compose file is for your laptop. The platform needs a stricter version. **Save it as `demo/compose.yaml`**, next to your own compose file, so the workflow check and the agent kit find it, and so you submit exactly that file.
Three changes are always needed:

- Replace every `build` with an `image` (the line from Step 1).
- Add `x-demo` to say which service is public.
- Remove anything that comes from a `.env` file or another file.

Here is a real student file (React with nginx, Spring Boot, Postgres), shortened:

<!-- before-example -->
```yaml
services:
  db:
    image: postgres:18
    environment:
      POSTGRES_DB: healthyrolls
      POSTGRES_USER: healthyrolls
      POSTGRES_PASSWORD: healthyrolls
    ports:
      - "5433:5432"
    volumes:
      - healthyrolls-db:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U healthyrolls -d healthyrolls"]
      interval: 5s
      timeout: 5s
      retries: 10

  server:
    build: ./server
    depends_on:
      db:
        condition: service_healthy
    environment:
      SPRING_PROFILES_ACTIVE: postgres
      DB_URL: jdbc:postgresql://db:5432/healthyrolls
      DB_USER: healthyrolls
      DB_PASSWORD: healthyrolls
      JWT_SECRET: ${JWT_SECRET:-dev-only-secret-change-me-at-least-32-chars}
    ports:
      - "8080:8080"

  client:
    build: ./client
    depends_on:
      - server
    ports:
      - "3000:80"

volumes:
  healthyrolls-db:
```

The platform rejects it for two reasons: `build` is not allowed, and there is no `x-demo`. It also warns that `ports` is ignored.
After the conversion:

<!-- compose-example -->
```yaml
x-demo:
  web: client        # the one service that browsers can reach
  port: 80           # the port it listens on inside its container

services:
  db:
    image: postgres:18
    environment:
      POSTGRES_DB: healthyrolls
      POSTGRES_USER: healthyrolls
      POSTGRES_PASSWORD: healthyrolls
    volumes:
      - healthyrolls-db:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U healthyrolls -d healthyrolls"]
      interval: 5s
      timeout: 5s
      retries: 10

  server:
    image: ghcr.io/healthy-team/healthyrolls-server:0123456789abcdef0123456789abcdef01234567
    command: ["--seed"]          # the app loads its demo data at startup (see "Data in a demo")
    depends_on:
      db:
        condition: service_healthy
    environment:
      SPRING_PROFILES_ACTIVE: postgres
      DB_URL: jdbc:postgresql://db:5432/healthyrolls
      DB_USER: healthyrolls
      DB_PASSWORD: healthyrolls
      JWT_SECRET: ${JWT_SECRET:-dev-only-secret-change-me-at-least-32-chars}
      JAVA_TOOL_OPTIONS: -XX:MaxRAMPercentage=50
    healthcheck:                 # healthy when the port answers (see "Limits you run under")
      test: ["CMD-SHELL", "bash -c 'echo > /dev/tcp/127.0.0.1/8080'"]
      interval: 5s
      timeout: 3s
      retries: 30
      start_period: 10s

  client:
    image: ghcr.io/healthy-team/healthyrolls-client:0123456789abcdef0123456789abcdef01234567
    depends_on:
      server:
        condition: service_healthy

volumes:
  healthyrolls-db:
```

What changed:

- `build: ./server` and `build: ./client` became `image:` lines. Each tag is a commit SHA printed by the workflow.
- `x-demo` names `client`, the nginx service. Its `ports: "3000:80"` line is gone, because the platform publishes only the `x-demo` service.
- The `db` and `server` `ports` lines are gone too. Services reach each other by service name (`db`, `server`) on a private network, so they do not need published ports.
- `JWT_SECRET: ${JWT_SECRET:-...}` is kept: with no `.env` file on the platform, the text after `:-` is the value. See [Configuration values](#configuration).
- `command: ["--seed"]` is explained in [Data in a demo](#data). `JAVA_TOOL_OPTIONS` and the `healthcheck` (which makes the demo go live only once the API answers) are explained in [Limits](#limits).

If you keep `ports` or `container_name`, nothing breaks. The platform ignores them and shows a warning.

<a id="dropped-and-rejected-keys"></a>
## Keys that are dropped or rejected

**Dropped with a warning** (the file is still accepted):

| Key | Why |
|---|---|
| `version` | Obsolete in Compose. |
| `ports` | Only the `x-demo` service is published. |
| `container_name` | The platform names containers. |
| `restart` | The platform sets `restart: on-failure`, and no restart for a one-shot service (see below). |
| `networks` (without options) | All your services share one private network. |

**Rejected** (the file is not accepted):

| Key | What to do |
|---|---|
| `build` | Use `image`. See [Step 1](#publish-images). |
| `env_file`, `include`, `extends`, `label_file` | Write the values in this one file. |
| bind mounts (`./data:/data`), anonymous volumes | Use a named volume declared under `volumes:`. |
| `privileged`, `cap_add`, `devices`, `security_opt`, `network_mode`, `pid`, `ipc` and similar | Remove them. The platform sets the safe values. |
| `mem_limit`, `cpus`, `deploy`, `ulimits` | Remove them. The platform sets limits. See [Limits](#limits). |
| `secrets`, `configs` | Add the value on your group's Secrets page and write `${secret:NAME}` in `environment` (see [Secrets](#secrets-and-private-images)), or bake a non-secret file into the image. |
| `platform`, `pull_policy`, `hostname`, `dns`, `extra_hosts`, `labels`, `logging` | Remove them. |
| any key the platform does not know | Remove it, or ask the instructor. |

The complete list, with one section per rule, is in `docs/compose-policy.md` of the platform repository. Every message on the check page names its rule (for example `COMPOSE-BUILD`).

<a id="public-entry-point"></a>
## One public address: the `/api` proxy

Browsers can reach **one** service per group: the one named in `x-demo`. Your other services (backend, database) are reachable only from your own services, by name.

So a frontend must not call `http://localhost:8080` from the browser: on the platform, "localhost" is the visitor's own computer. Call `/api/...` on the same address as the page, and let nginx forward it to the backend.

In frontend code:

```js
// Before: fetch("http://localhost:8080/api/orders")
fetch("/api/orders")
```

The nginx service serves the production build and forwards `/api` to the backend. Save this as `nginx.conf` next to your frontend `Dockerfile`; change `backend` and `8080` to your backend's service name and port:

```nginx
# Serves the production build of your frontend and proxies /api to the backend, so the browser
# only ever talks to one address. Copy this file next to your frontend's Dockerfile.
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Docker's built-in DNS. With it, nginx looks "backend" up when a request arrives, so nginx
    # still starts if the backend is not ready yet or is restarted later.
    resolver 127.0.0.11 valid=10s ipv6=off;

    # Anything under /api goes to the backend service (change the name and port to match your
    # compose file). Do not add a path after the port: the request path is passed on unchanged.
    location /api/ {
        set $backend http://backend:8080;
        proxy_pass $backend;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # The platform gives up after 60 seconds, so there is no point waiting longer.
        proxy_read_timeout 55s;
    }

    # Everything else is the single-page app. Unknown paths fall back to index.html so that
    # client-side routes (React Router, Vue Router) work on a page refresh.
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

If your backend does not expect the `/api` prefix, use a rewrite (`rewrite ^/api/(.*)$ /$1 break;`) before `proxy_pass`.
If you already have your own `nginx.conf` that proxies `/api` (many groups do), keep it. It works as long as the service name in `proxy_pass` matches your compose file.

**A complete starter file** (nginx `web`, `backend`, Postgres `db`):

<!-- compose-example -->
```yaml
# Starter kit: the shape the platform likes best.
#   web      nginx: serves your frontend's production build and proxies /api to backend (public)
#   backend  your API (Spring Boot, Express, Django, ...)
#   db       Postgres with a healthcheck and a named volume
# Replace each `image:` with the line printed by the GitHub Actions workflow (see README.md).
x-demo:
  web: web
  port: 80

services:
  web:
    image: ghcr.io/your-team/your-repo-web:0123456789abcdef0123456789abcdef01234567
    depends_on:
      backend:
        condition: service_healthy   # the demo goes live only when the API answers

  backend:
    image: ghcr.io/your-team/your-repo-backend:0123456789abcdef0123456789abcdef01234567
    depends_on:
      db:
        condition: service_healthy
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/app
      SPRING_DATASOURCE_USERNAME: app
      SPRING_DATASOURCE_PASSWORD: demo-password
      # Keep the JVM inside the memory cap of your group (see "Limits" in README.md).
      JAVA_TOOL_OPTIONS: -XX:MaxRAMPercentage=60
    healthcheck:
      # Healthy when port 8080 accepts a connection. Uses bash, which most Java images have
      # (many have no curl). Spring Boot needs 15 to 40 seconds to start.
      test: ["CMD-SHELL", "bash -c 'echo > /dev/tcp/127.0.0.1/8080'"]
      interval: 5s
      timeout: 3s
      retries: 30
      start_period: 10s

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD: demo-password
    volumes:
      - dbdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  dbdata:
```

**A single service that serves both the UI and the API** (for example a Spring Boot app that serves its own pages) needs no nginx at all:

<!-- compose-example -->
```yaml
x-demo:
  web: app
  port: 8080

services:
  app:
    image: ghcr.io/your-team/your-repo-app:0123456789abcdef0123456789abcdef01234567
```

<a id="production-build"></a>
## Serve a production build, listen on 0.0.0.0

### Do not run a development server

Do not serve your frontend with `vite`, `npm run dev`, `ng serve` or `react-scripts start`. They are meant for your laptop.
Build the frontend once (`npm run build`) and serve the files with nginx. This is also much lighter on memory and faster to start.

The Dockerfile below does it. Save it as `Dockerfile` in your frontend folder, next to `nginx.conf`:

```dockerfile
# Production image for a Vite, React, Vue or Angular frontend: build once, then serve the files
# with nginx. Save it as `Dockerfile` in your frontend folder, next to `nginx.conf`.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite and React write to dist/. Angular writes to dist/<project>/browser: adjust the COPY below.
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

**Symptom:** the demo page shows **"Blocked request. This host is not allowed."** That is the Vite development server refusing the demo address. Serving the production build with nginx removes the problem.

### Listen on all interfaces

Every service must listen on `0.0.0.0` (all interfaces), not only `127.0.0.1` (the container itself). Otherwise no other container, including nginx, can reach it.

**Symptom:** nginx answers `502 Bad Gateway`, or your frontend's proxy logs `connection refused`.

| Stack | How to listen on all interfaces |
|---|---|
| Spring Boot | `--server.address=0.0.0.0`, or `SERVER_ADDRESS: 0.0.0.0` in `environment` (it is already the default unless `server.address` is set) |
| Express | `app.listen(3000, "0.0.0.0")` |
| Flask | `app.run(host="0.0.0.0")` |
| Django | `python manage.py runserver 0.0.0.0:8000` (or gunicorn `-b 0.0.0.0:8000`) |

<a id="configuration"></a>
## Configuration values and secrets

The platform gives your containers **no** environment variables of its own and reads **no** `.env` file. Every value must be written in the compose file:

- `${NAME:-default}` gives `default`. This is the safe way to keep a compose file that also works locally.
- `${NAME}` and `$NAME` become **empty text** (with a warning). A `${JWT_SECRET}` that exists only in your local `.env` will be empty on the platform.
- `$$` is a literal `$`. If a password contains a dollar sign, write `$$`.
- `${NAME:?message}` is an error.

```yaml
environment:
  JWT_SECRET: ${JWT_SECRET:-change-me-demo-only-32-characters-long}
  DB_PASSWORD: pa$$word      # the container receives pa$word
```

**Do not put real credentials in the compose file.** The file is stored with your submission and staff can read it. Use throwaway values for the demo database and demo accounts.
**Third-party keys.** The app must start with every external key absent, and switch the feature off when its key is empty. Browser keys (Stripe publishable, Google Maps, Firebase web config) are frozen into the bundle at build time, so a platform secret cannot supply them: restrict them by HTTP referrer.
For real credentials (API keys, database passwords) use a group secret, and for a private image a registry token: see [Secrets and private images](#secrets-and-private-images).

<a id="secrets-and-private-images"></a>
## Secrets and private images

### Secrets

A secret is a value that your program needs but that must not appear in the compose file or in an image: an API key, a database password, an OAuth client secret. You store it once on the platform, and the platform gives it to your own services when they start.

1. Open your group's **Secrets** page.
2. Under **Add or overwrite a secret**, type a name and the value, then **Save secret**.
3. In your compose file, write `${secret:NAME}` alone as the value of an environment variable:

```yaml
services:
  api:
    image: ghcr.io/<owner>/<repo>-api:<commit>
    environment:
      STRIPE_API_KEY: ${secret:STRIPE_API_KEY}    # the container receives the stored value
      PAYMENTS_MODE: test                          # a plain value is still a literal
```

The variable name on the left can differ from the secret's name. Only the exact form `${secret:NAME}` counts: A value such as `prefix-${secret:NAME}` is rejected (`COMPOSE-INTERPOLATION`). The checker and the submission reject a reference to a secret your group has not defined (`COMPOSE-SECRET-UNDEFINED`).

Rules:

- The name starts with a capital letter, then only capital letters, digits and `_`, at most 64 characters. `DEMO_` and `PLATFORM_` are reserved.
- A value is **one line**, at most 8 KiB. For a multi-line value such as a PEM key, base64-encode it (`base64 -w0 key.pem`, or `base64 -i key.pem` on a Mac), save that, and decode it in your app.
- A group holds at most 50 secrets. The secrets one service references can total at most 256 KiB.

What the platform does with it:

- **Write-only.** After you save, the value is never shown again, to you or to anyone. To change it, save a new value under the same name. Staff see the names and the dates, never a value, on any platform page.
- **Your own logs are different.** Whatever your program prints goes to your runtime logs, and your group and staff can read those. **Never log a secret or print your environment.**
- **Never bake a secret into an image**, and never write it in the compose file. Images and the compose file are stored and can be read by others.
- **Changes apply at the next deploy.** A running container keeps the value it started with until you submit or redeploy.
- **Deleting or renaming a secret breaks old versions.** Every deploy looks the secret up again, including a rollback to an earlier version and the platform's automatic bring-back of your demo. A version that references a secret you deleted fails with `undefined secret: NAME`, and the running version stays up. Add the secret again (same name), then redeploy.

### Private images

Your packages no longer have to be public.

1. On GitHub, create a **personal access token (classic)**: Settings, Developer settings, Tokens (classic). Tick **only** `read:packages`. Give it an expiry that covers the course. A classic token can read every package of the account, so a dedicated GitHub account for the group is safer than a personal one.
2. On your group's **Private registry tokens** page (linked from the Secrets page), enter host `ghcr.io`, the GitHub username that owns the token, and the token, then **Save token**. A group holds at most 10 tokens, one per registry host.
3. Submit as usual. An image that cannot be read anonymously is accepted when your group has a token for its host, and the platform checks it with your token during the deploy.

Things to know:

- **The image is pinned at its first deploy.** Pushing a fix under the same tag does not change a version that already deployed. Make a new submission (and prefer a new tag, such as the commit SHA the workflow uses).
- **The token is used on every deploy** (submit, redeploy, rollback, bring-back). If it expires or you revoke it, the next deploy fails and the running version stays up. Save a new token on the same page.
- **Messages you may see on the submission page:**
  - "add a registry token for ghcr.io": your group has no token for that host.
  - "the registry refused your group's token, or the image does not exist or the token cannot read it": check the image name, that the token has `read:packages`, has not expired, and that its account can read the package (for an organization's package, the token may need to be authorized for the organization). Then update the token on the **Private registry tokens** page.
  - "the image was not found with your group's registry token": the name or tag is wrong, or the token's account cannot see the package.
  - "it is too large" or "provides only linux/arm64": same as for public images. See [Limits](#limits) and [Building images](#building-images).
- **The workflow's own token is only for pushing.** The `GITHUB_TOKEN` in the publish workflow cannot be given to the platform. Create the separate read-only token above.

<a id="limits"></a>
## Limits you run under

| Limit | Value |
|---|---|
| Memory and CPU for the whole group | **2 GB and 1 vCPU** (the instructor can raise it for a group: ask) |
| Services per stack | 1 to 8 |
| Compose file size | 64 KiB |
| tmpfs mounts | 64 MiB by default, at most 256 MiB each |
| Image size | at most 5 GB (compressed layers) |
| Processes per container | 256 |
| Writable disk (volumes and container layers) | 5 GB per group |
| Healthcheck timings | `interval`, `timeout` and `start_interval` are clamped to 1 to 300 s, `start_period` to 0 to 600 s, `retries` to 1 to 100 |
| Stop timeout | fixed at 10 s: your service gets SIGTERM, then is killed (`stop_grace_period` is ignored) |
| Request body | 25 MB |
| Response body | 50 MB, delivered whole (no streaming) |
| Time to first byte | 60 s, then the visitor gets a 504 |

**Memory and Java.** Your containers are killed if the group goes over its memory cap (out-of-memory, exit code 137). The JVM does not know your other services also use memory. Tell it to use only part of the cap:

```yaml
environment:
  JAVA_TOOL_OPTIONS: -XX:MaxRAMPercentage=50
```

`50` leaves room for Postgres and nginx. A Spring Boot service with Postgres typically needs about 600 to 900 MB in total. If your stack really needs more, ask the instructor to raise the cap.

**Starting up.** The platform starts your services and waits up to 5 minutes for them to be running and healthy. A service that has a `healthcheck` must pass it. After that, it watches your stack for 15 more seconds: a service that crashes (exits with an error) 3 times fails the deployment, and the previous version, if there is one, is put back.
Spring Boot can take 15 to 40 seconds to start (about 20 seconds on a 1 vCPU cap). A service without a healthcheck counts as ready as soon as it is *running*, so your demo address would show errors until Spring has finished starting. Give the backend a healthcheck, and make the public service wait for it with `condition: service_healthy`. The starter `compose.yaml` above does both. Most Java images have `bash` but no `curl`, so it checks that the port accepts a connection:

```yaml
    healthcheck:
      test: ["CMD-SHELL", "bash -c 'echo > /dev/tcp/127.0.0.1/8080'"]
      interval: 5s
      timeout: 3s
      retries: 30
      start_period: 10s
```

`restart` is always `on-failure`, with one exception: a **one-shot** service gets no restart. A one-shot is a service that another service waits for with `condition: service_completed_successfully`, such as a `migrate` job. If it exits with an error, it stays stopped and the deploy fails within seconds, instead of retrying until the deploy times out. So a one-shot must not rely on Docker restarting it until the database is ready: make it wait for the database with `condition: service_healthy` on the database's health check.

When a deploy fails, the deploy log on the Logs page says which service failed and how ("migrate exited with code 2") and shows the last lines that service printed.

**Streaming.** Responses are delivered whole. Server-sent events (`text/event-stream`) and long streaming downloads do not work. WebSockets do.

**Reserved path.** `/_platform/` on your demo address belongs to the platform. Your app never receives requests for it. Do not use it, and do not put `%2F`, `%5C` or `%00` in URL paths: the platform refuses them.

**Runtime.** Containers run with the standard Docker runtime and extra restrictions: no extra privileges, no `ping` (the NET_RAW capability is dropped), no setuid tricks, user IDs remapped, no access to the Docker socket or the host. Internet access works, but the platform's own network, cloud metadata, private network ranges and mail port 25 are blocked.
Logs: write to standard output and error; the last lines are visible on the Logs page.

<a id="shared-site"></a>
## Several demos share one site (CSRF)

All demos live under the same demo domain, so a browser treats them as **the same site**. A page of another group's demo can make your visitor's browser send a request to your demo. Protect state-changing requests (anything that is not a plain GET):

- Use CSRF tokens (Spring Security and Django do by default; Express needs `csurf` or similar), or check the `Origin` header against your own address.
- Behind the proxy the backend sees plain `http`, so its Origin check fails. Trust the forwarded headers (Spring: `SERVER_FORWARD_HEADERS_STRATEGY: framework`) or allow your demo address. Keep CSRF on.
- Do not rely on `SameSite` cookies alone: they do not separate your demo from the other groups' demos.
- Keep your cookies host-only (never set `Domain=`), and do not name a cookie `__Host-demo`: the platform uses that name.

<a id="data"></a>
## Data in a demo

- **Volumes.** Data lives in named volumes. It **survives redeploys and restarts**, so a new version starts with the data of the old one.
- **Named volumes only.** Declare each volume under the top-level `volumes:` and mount it as `name:/path`. Bind mounts (`./data:/data`) and anonymous volumes are rejected, and so are volume options such as `driver` or `external`.
- **Seed automatically.** Your demo must not depend on someone typing data in by hand. Load demo data when the app starts, and make it safe to run twice (skip it when the data is already there). Spring Boot: an `ApplicationRunner` or `data.sql` guarded by a count; many projects take a `--seed` argument, which you pass with `command: ["--seed"]`. For a separate seed job, add a one-shot service that runs your image with a different command and exits with code 0. The platform treats an exited-0 service as done.
- **Reset data.** On the Submissions page, "Reset data" deletes **all** your group's volumes and redeploys the current version with empty volumes (you type your group's slug to confirm). Your seed then runs again.
- **Migrations.** If a new version changes the database schema and fails to start, the platform rolls back to the previous version, which must still be able to read the migrated data. Keep migrations backward-compatible (add columns, do not drop or rename), or use "Reset data" after a rollback.
- **The schema comes from the repository.** Migrations, JPA or a committed dump work. Tables made by hand in a hosted console (Supabase, Neon, Firebase) do not: export the schema (`pg_dump --schema-only`) into the repository and run it from the app or a database image.
- **No backups.** Student databases are not backed up. Treat the data as disposable and keep your seed script in the repository.

<a id="rehearse"></a>
## Step 4: rehearse, check, submit

### Rehearse on your laptop

Run the converted file **exactly as the platform will**: only published images, no `build`.
Add a small second file that publishes the public service on your laptop (the platform ignores `ports`; your laptop needs it):

```yaml
# demo/rehearse.yaml
services:
  client:           # the service named in x-demo
    ports:
      - "8080:80"   # <laptop port>:<x-demo port>
```

```bash
docker compose -f demo/compose.yaml -f demo/rehearse.yaml up
```

Open `http://localhost:8080`. Click through the demo with an empty database. Then stop it with `Ctrl+C` and `docker compose -f demo/compose.yaml -f demo/rehearse.yaml down -v`, and start it again to see that the seed works from scratch.
On an Apple-silicon Mac, `linux/amd64` images run under emulation, so they are slower than on the platform. That is normal.

### Check the file

Open **Check compose file** in the platform's menu, paste your compose file and press Check. It shows the same report as a real submission, with the line and rule of every problem and a link to the section of this guide that explains the fix. It saves nothing and deploys nothing.

### Submit

On your group page, open **Submit a stack**, upload or paste your `demo/compose.yaml` and submit. The platform then:

1. checks the file again,
2. looks up each image in its registry and checks that it has `linux/amd64` (a private image is checked by the deployer, with your group's token),
3. deploys the stack and waits until it is healthy,
4. switches your demo address to the new version.

If the new version does not start, the platform puts the previous version back and shows why on the submission page. The Logs page shows the last lines of each service.

<a id="reviewing"></a>
## Reviewing other groups' demos

While another group's demo is running and open to you (the demo session is open, or the instructor opened that group), its gallery card shows **Leave a review**. Give 1 to 5 stars, tick any keywords that fit and add a comment if you like. Once the demo closes you can no longer start a review, but the card still shows your stars and you can still edit the review you wrote. You cannot review your own group.

Your review is sent to the instructor only. Your group and the group you review do not see it. The platform records your reviews, and which demos you open, for class participation.

<a id="compose-file-shape"></a>
## Errors about the file itself

These messages say the file is not valid YAML, is too big or too deeply nested, or has a name or value in the wrong shape.

- **YAML errors** (`COMPOSE-YAML-SYNTAX`, `COMPOSE-DUPLICATE-KEY`, ...): check the indentation (spaces, never tabs) and quoting near the reported line. A key can appear only once in a block.
- **Names:** service and volume names use lowercase letters, digits, `-` and `_`, start and end with a letter or digit, and have at most 63 characters. `web`, `db-data` and `api_v2` are fine; `Web`, `my service` and `-db` are not. The name `<your-slug>-web` is reserved for your public service.
- **`x-demo`:** it must name a service from `services`, and `port` must be a single number from 1 to 65535: `x-demo: { web: client, port: 80 }`.
- **`depends_on`** must name services that exist in the same file, with no loops. The conditions are `service_started`, `service_healthy` and `service_completed_successfully`.
- **Every service needs an `image`.** Services are limited to 8.
- **Durations** are written like `30s`, `1m30s` or `500ms`.

Run the checker again after each fix: it lists every problem, not only the first.

<a id="faq"></a>
## FAQ

Short answers. Each links to the section with the detail.

**Choosing a route**

- **Which route fits us, and can we switch?** A to go fast and review the result, B to learn the steps, C if you are stuck. You can switch at any time. [Choose your route](/guide/start/)
- **What can an agent not do?** Publish for you, make packages public, save secrets or submit. Those steps are yours. [Route A](/guide/route-a/)
- **The agent broke our code.** Review its diff and revert what you do not want. Your group answers for every commit. [Route A](/guide/route-a/)

**Images and GHCR**

- **"Does not exist, or is private".** The package is private or the name is wrong. Make it public or add a token. [Step 2](#make-packages-public)
- **"Provides only linux/arm64" or `exec format error`.** Built on an Apple-silicon Mac without `--platform linux/amd64`. Let the workflow build. [Building images](#building-images)
- **The workflow fails.** Open the run and read the red step. Usually a wrong folder in `SERVICES` or a `Dockerfile` that does not build: try `docker build` locally. [Step 1](#publish-images)
- **"It is too large".** Images are limited to 5 GB (compressed). Copy only the build output into the final image, as the frontend Dockerfile does. [Limits](#limits)

**Compose file**

- **Why was my file rejected?** Read the rule ID in the message. The checker links the section that explains it. [Errors about the file](#compose-file-shape)
- **Which service is public?** Only the one named in `x-demo`. `ports` is ignored. [Step 3](#convert-compose)
- **`build` is rejected.** Use `image` lines from the workflow. [Step 1](#publish-images)
- **Bind mounts and `env_file` are rejected.** Use named volumes and values in `environment`. [Keys that are rejected](#dropped-and-rejected-keys)
- **My backend is not ready in time.** Add a healthcheck and make the frontend wait for it. [Limits](#limits)
- **An env var is empty.** `${NAME}` with no default becomes empty. Write `${NAME:-default}`. [Configuration](#configuration)

**Frontend and backend**

- **CORS or CSRF errors on a POST.** Behind the proxy the backend sees plain `http`. Pass the forwarded headers on, and keep CSRF protection on. [Shared site](#shared-site)
- **Nothing loads after the login page.** The frontend calls `localhost`. Use `/api`, the same address as the page. [The /api proxy](#public-entry-point)
- **"Blocked request. This host is not allowed".** A dev server is running. Serve a production build behind nginx. [Production build](#production-build)
- **The backend is unreachable.** It must listen on `0.0.0.0`, not `127.0.0.1`. [Production build](#production-build)

**Database and data**

- **The demo is empty after deploy.** The platform starts with an empty database. Load demo data at startup and make it safe to run twice. [Data](#data)
- **Does data survive a redeploy?** Yes, in named volumes. [Data](#data)
- **How do I start over?** Use "Reset data" on the Submissions page. [Data](#data)
- **The schema was made by hand in a hosted console.** The schema must come from the repository: migrations, JPA or a committed dump. [Data](#data)

**Secrets and third-party keys**

- **Where do secrets go?** On your group's Secrets page, used as `${secret:NAME}`. [Secrets](#secrets-and-private-images)
- **Can I put a key in the repo or ask my agent to use one?** No. Use a group secret. If a key is already committed, rotate it. [Secrets](#secrets-and-private-images)
- **My app needs a third-party key to start.** It must start without it and switch the feature off. Browser keys are baked into the bundle: restrict them by referrer. [Configuration](#configuration)

**Deploying**

- **The status is stuck or failed.** A deploy waits up to 5 minutes, then fails. Read the deploy log on the Logs page: it names the failing service and shows its last output. [Submit](#rehearse)
- **How do I redeploy or go back?** Submit again, or roll back from the Submissions page. The old version stays up if a new one fails. [Submit](#rehearse)
- **What are my limits?** 2 GB, 1 vCPU, up to 8 services. [Limits](#limits)

**Demo night**

- **Who can open our demo, and when?** Signed-in course members, once the instructor opens the session or your group. [Reviewing](#reviewing)
- **Does Safari work?** Yes, like any browser. If a demo will not open, check that it is open to you (above), then tell a TA the browser and the time. [Reviewing](#reviewing)
- **Do reviews count?** Reviews and the demos you open are recorded for participation. [Reviewing](#reviewing)

**Getting help**

- **What do I send a TA, and by when?** Repository link, branch, how to run it and the names of your env vars, never values, at least one week before the demo. [Route C](/guide/route-c/)
