# Compose policy

The platform runs your group's stack from a compose file, but it never runs that file as written. It reads your file, checks it against the rules on this page, and builds its own clean copy from what it understood. This page lists what the platform accepts, every rule that can reject or warn about your file, and how to fix each one.

Use **Check compose file** (`/compose/check/`, also in the menu) to try your file before you submit it. The check shows the same report as a real submission. It saves nothing and deploys nothing. Course members (group members, TAs and the instructor) can use it.

Policy version: **0.3.0**. Every report shows the version that produced it.

## How to read a report

A report lists **errors** and **warnings**, each with the line and column in your file, a rule ID, a short message and a hint on how to fix it.

- An **error** means the file is rejected. Fix every error and check again.
- A **warning** means the file is still accepted. The platform ignored something, or something in your file did not do what you may expect.

The report lists every problem it finds, not just the first. Rule IDs are stable: each one has a section below, and its anchor is the ID in lowercase (for example `#compose-build`).

Environment values never appear in a report, so a password you wrote in `environment` is not repeated back to you. A report may still show names from your file, such as service names, variable names and keys.

## What the platform accepts

A compose file with these top-level keys:

| Key | Meaning |
|-----|---------|
| `services` | Required. 1 to 8 services. |
| `x-demo` | Required. Names the one public service: `x-demo: { web: <service name>, port: <container port> }`. |
| `volumes` | Optional. Named volumes, declared with no options. |
| other `x-...` keys | Allowed as places to keep YAML anchors. They are ignored. |

Each service may use only these keys:

| Key | Notes |
|-----|-------|
| `image` | Required. A public registry image (see [Images](#images)). |
| `command`, `entrypoint` | Text or a list. |
| `environment` | Literal values (see [Environment values and dollar signs](#environment-values-and-dollar-signs)). |
| `depends_on` | A list of service names, or a map with a `condition`. |
| `healthcheck` | `test`, `interval`, `timeout`, `start_period`, `start_interval`, `retries`, `disable`. |
| `expose` | Internal ports. |
| `working_dir`, `user`, `init` | As in Compose. |
| `tmpfs` | Size-capped in-memory mounts. |
| `stop_grace_period` | A duration such as `30s`. |
| `volumes` | Mounts of named volumes declared at the top level, written `name:/path` or `name:/path:ro`. |

Anything not on these lists is rejected (`COMPOSE-UNKNOWN-KEY`), unless it has its own rule below. This is deliberate: a key is allowed only after the platform has decided it is safe.

A duration is a number and a unit, such as `30s`, `1m30s` or `500ms` (units `ns`, `us` or `µs`, `ms`, `s`, `m`, `h`), and decimals such as `1.5s` are fine.

A minimal accepted file:

```yaml
x-demo:
  web: app
  port: 8000
services:
  app:
    image: ghcr.io/your-team/app:1.0.0
    environment:
      DATABASE_URL: postgres://app:change-me@db:5432/app
    depends_on: [db]
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: change-me
    volumes:
      - dbdata:/var/lib/postgresql/data
volumes:
  dbdata:
```

Services reach each other by service name (`db` above) on a private network that belongs to your group.

## Limits

| Limit | Current value |
|-------|---------------|
| File size | 64 KiB |
| Services | 1 to 8 |
| YAML documents | Exactly 1 |
| Nesting depth | 32 levels (also counted after anchors and aliases are expanded) |
| Size after expanding anchors and aliases | 10,000 nodes |
| Service and volume names | Lowercase letters, digits, `_` and `-`; start with a letter or digit; up to 63 characters |
| tmpfs size | 64 MiB if you give none; at most 256 MiB per mount |

Text pasted into the check counts line breaks as one byte, so it is measured the same as the file you would upload.

If your stack needs more, ask the instructor.

## Keys that are dropped with a warning

Some keys appear in almost every tutorial, and the platform sets them itself. Instead of rejecting your file, the platform drops them and warns you, so a first attempt is not rejected for something harmless.

| Key | Why it is ignored | Rule |
|-----|-------------------|------|
| `version` | Obsolete in Compose. | [COMPOSE-VERSION-IGNORED](#compose-version-ignored) |
| `ports` | Only the `x-demo` service is published. | [COMPOSE-PORTS-DROPPED](#compose-ports-dropped) |
| `container_name` | The platform names containers. | [COMPOSE-CONTAINER-NAME-DROPPED](#compose-container-name-dropped) |
| `restart` | The platform sets the restart policy. | [COMPOSE-RESTART-DROPPED](#compose-restart-dropped) |
| `networks` (simple form) | The platform gives your services one private network. | [COMPOSE-NETWORKS-DROPPED](#compose-networks-dropped) |

The platform does not use the values of these keys in any way.

## Environment values and dollar signs

`environment` takes literal values. Every variable needs a value written in the file: `environment: [DEBUG]` (which would copy the variable from the host in Docker Compose) is an error, because the platform never copies its own environment into your containers.

Compose treats `$` as the start of a variable, and the platform follows the same syntax, with one difference: **no variable has a value**. The platform reads no `.env` file and no host environment. So:

- `$$` is a literal `$`. Write `$$` anywhere a real `$` belongs, for example in a password (`pa$$word` gives `pa$word`).
- `${NAME:-default}` and `${NAME-default}` give `default`.
- `$NAME` and `${NAME}` become empty text, with a warning ([COMPOSE-UNSET-VARIABLE](#compose-unset-variable)).
- `${NAME:?message}` and `${NAME?message}` are errors ([COMPOSE-VARIABLE-REQUIRED](#compose-variable-required)).
- A `$` that does not start valid syntax is an error ([COMPOSE-INTERPOLATION](#compose-interpolation)).

In a `command`, write `$$HOME` for a shell variable that the container should expand itself.

For private values, write `${secret:NAME}` alone as the value of an environment variable. The secret must exist in your group's secrets, otherwise the file is rejected as not defined ([COMPOSE-SECRET-UNDEFINED](#compose-secret-undefined)). A student who is not in a group yet gets a warning instead of that error, because there are no secrets to check against.

## Images

`image` must point at a public registry such as Docker Hub or GHCR. The platform never builds images from your repository, so build and publish your image first (GitHub Actions can do it), then reference it with `image`. The platform runs `linux/amd64` images.

## Rules

Each rule is listed with its severity and how to fix it.

### Reading the file

#### COMPOSE-SIZE
Error. The file is larger than the size limit. Remove unused services, comments and long values, or ask the instructor.

#### COMPOSE-ENCODING
Error. The file is not valid UTF-8 text. Save it as UTF-8.

#### COMPOSE-YAML-SYNTAX
Error. The file is not valid YAML. Check the indentation and quoting near the reported line.

#### COMPOSE-MULTI-DOC
Error. The file has more than one YAML document. Remove the extra `---` separator and everything after it.

#### COMPOSE-NOT-MAPPING
Error. The top level must be a mapping that starts with `services:`. An empty file is rejected too.

```yaml
services:
  app:
    image: ghcr.io/your-team/app:1.0.0
```

#### COMPOSE-YAML-TAG
Error. Custom YAML tags (such as `!reset`, `!override` or `!!python/...`) are not allowed. Remove the tag and write a plain value.

#### COMPOSE-DUPLICATE-KEY
Error. The same key appears twice in one mapping, or the same variable twice in an `environment` list, and YAML would silently drop one. Keep one of them. To merge several anchors, use a list: `<<: [*a, *b]`.

#### COMPOSE-COMPLEX-KEY
Error. A mapping key must be a plain value, not a list or a mapping. Write the key as a simple string.

#### COMPOSE-MERGE-INVALID
Error. The value of a `<<` merge key must be a mapping or a list of mappings, for example `<<: *common`.

#### COMPOSE-EXPANSION
Error. The file nests too deeply, an alias refers to the node that contains it, or anchors and aliases expand to more than the limit. Flatten the structure or remove nested aliases.

### Shape of the file

#### COMPOSE-UNKNOWN-KEY
Error. The key is not on the accepted lists above. Remove it. If a key you need has no rule below, ask the instructor.

#### COMPOSE-INVALID-VALUE
Error. A value has the wrong type or shape (for example a number where text is expected), or a duration is not written like `30s`. Check the value against the accepted keys above.

```yaml
healthcheck:
  interval: 30s     # not "30 seconds"
```

#### COMPOSE-MISSING-KEY
Error. A required key is missing from the mapping the report points at. Add it.

#### COMPOSE-NAME
Error. A service or volume name is not allowed. Names are registry path components: lowercase letters and digits, joined by `_`, `__` or `-`, so no leading or trailing `-` or `_` and no `___`, and at most 63 characters (pattern `[a-z0-9]+(?:(?:_|__|-+)[a-z0-9]+)*`). For example `web` or `db-data`; `web-`, `web_`, `_web` and `a___b` are rejected.

#### COMPOSE-SERVICE-COUNT
Error. A stack needs between 1 and 8 services. Remove services you do not need for the demo, or ask the instructor.

#### COMPOSE-X-DEMO-MISSING
Error. The file does not say which service is public. Add `x-demo: { web: <service name>, port: <container port> }` at the top level.

#### COMPOSE-X-DEMO-SERVICE
Error. `x-demo.web` names a service that is not in `services`. Use the name of one of your services.

#### COMPOSE-X-DEMO-PORT
Error. `x-demo.port` must be a single integer from 1 to 65535: the port your public service listens on inside its container.

#### COMPOSE-X-DEMO-INVALID
Error. `x-demo` is malformed: `web` must be a service name, and both `web` and `port` must be present. Write `x-demo: { web: <service name>, port: <container port> }`.

#### COMPOSE-IMAGE-MISSING
Error. A service has no `image`. Build and push your image to a public registry, then reference it with `image`.

### Ignored, with a warning

#### COMPOSE-VERSION-IGNORED
Warning. `version` is obsolete and ignored. Remove it.

#### COMPOSE-PORTS-DROPPED
Warning. `ports` is ignored: the platform publishes only the `x-demo` service. Declare the public service in `x-demo`, and list internal ports under `expose`.

#### COMPOSE-CONTAINER-NAME-DROPPED
Warning. `container_name` is ignored: the platform names containers. Reach other services by their service name.

#### COMPOSE-RESTART-DROPPED
Warning. `restart` is ignored: the platform sets the restart policy. Remove it.

#### COMPOSE-NETWORKS-DROPPED
Warning. `networks` is ignored: all your services share one private network and reach each other by service name. Remove it.

#### COMPOSE-UNSET-VARIABLE
Warning. A `$NAME` or `${NAME}` has no value, because the platform supplies no variables, so it becomes empty text. Write a default (`${NAME:-value}`), a literal value, or `$$` for a literal `$`. Inside a `command`, write `$$NAME` for a shell variable.

### Networks

#### COMPOSE-NETWORK-OPTIONS
Error. A top-level network has options (driver, subnet, and so on). The platform assigns networks. Declare it with no options, or remove it.

#### COMPOSE-NETWORK-ATTACHMENT-OPTIONS
Error. A service attaches to a network with options (aliases, addresses). List the network name alone, or remove `networks`.

#### COMPOSE-NETWORK-UNDECLARED
Error. A service uses a network that is not declared at the top level. Remove `networks`: the platform assigns one for you.

### Volumes and tmpfs

A service may mount only a named volume that is declared at the top level, and the volume is declared with no options. The platform creates it for your group.

```yaml
services:
  db:
    image: postgres:16
    volumes:
      - dbdata:/var/lib/postgresql/data
volumes:
  dbdata:
```

#### COMPOSE-BIND-MOUNT
Error. A mount points at a path (`./data:/data`). Bind mounts are not allowed. Declare a named volume at the top level and mount it as `<name>:/container/path`.

#### COMPOSE-VOLUME-ANONYMOUS
Error. A mount has no volume name (`/data` alone). Declare a named volume and mount it as `<name>:/container/path`.

#### COMPOSE-VOLUME-UNDECLARED
Error. A mount uses a volume that is not declared at the top level. Add `<name>:` under the top-level `volumes`.

#### COMPOSE-MOUNT-TYPE
Error. A long-form mount must have `type: volume`. No other type is allowed.

#### COMPOSE-MOUNT-TARGET
Error. The container path of a mount must be absolute (start with `/`). Write `<volume>:/container/path`.

#### COMPOSE-MOUNT-INVALID
Error. A mount is malformed: it has no volume name, too many `:` parts, or an option other than `ro`. Write `<volume>:/container/path` or `<volume>:/container/path:ro`.

#### COMPOSE-VOLUME-EXTERNAL
Error. `external` on a volume could reach another group's data. Declare the volume with no options.

#### COMPOSE-VOLUME-OTHER-NAME
Error. `name` on a volume could point at another group's volume. Declare the volume with no options.

#### COMPOSE-VOLUME-DRIVER
Error. Volume drivers are chosen by the platform. Declare the volume with no options.

#### COMPOSE-VOLUME-DRIVER-OPTS
Error. Driver options can turn a volume into a mount of a host path. Declare the volume with no options.

#### COMPOSE-VOLUME-LABELS
Error. Labels on a volume are controlled by the platform. Declare the volume with no options.

#### COMPOSE-TMPFS-SIZE
Error. A tmpfs `size` must be a number of bytes with an optional `k`, `m` or `g` suffix, between 1 byte and 256 MiB. Without a size, a tmpfs mount gets 64 MiB.

```yaml
tmpfs:
  - /tmp:size=64m
```

#### COMPOSE-TMPFS-PATH
Error. A tmpfs mount needs an absolute container path, such as `/tmp`.

#### COMPOSE-TMPFS-OPTION
Error. A tmpfs option is not allowed. Allowed: `size=<n>`, `mode=<octal>`, `ro`, `rw`, `noexec`, `nosuid`, `nodev`.

### Environment, interpolation and secrets

#### COMPOSE-ENV-PASSTHROUGH
Error. An environment variable has no value (`- DEBUG`, or `DEBUG:` with nothing after it). The platform's environment is never copied into containers, so give every variable an explicit value.

#### COMPOSE-ENV-NAME
Error. A variable name is not valid. Names use letters, digits and `_`, and do not start with a digit. Write `NAME: value` in a mapping, or `NAME=value` in a list.

#### COMPOSE-INTERPOLATION
Error. A `$` is not valid variable syntax. Write `$$` for a literal `$`, or `${NAME:-default}` for a variable with a default.

#### COMPOSE-VARIABLE-REQUIRED
Error. A value uses `${NAME:?message}` or `${NAME?message}`, which requires a variable the platform does not supply. Write a literal value or a default. If the `$` was part of a password, write `$$`.

#### COMPOSE-SECRET-REF
Error. A secret reference is malformed. The value must be exactly `${secret:NAME}`, where NAME is 1 to 64 capital letters, digits or `_` and starts with a letter.

#### COMPOSE-SECRET-UNDEFINED
Error. The secret named in `${secret:NAME}` is not defined for your group. Define it with the platform's secrets feature, then submit again. A secret defined only by another group is not defined for yours.

#### SECRETS-NOT-CHECKED
Warning, from the check page only. A `${secret:NAME}` reference was not compared with any group's secrets, because there was no group to look in: you are not in a group yet, or (for staff) no group was chosen. Nothing is wrong with the file as far as this check can tell. The platform checks the reference again when you submit and when it deploys.

#### COMPOSE-TOP-SECRETS
Error. The top-level `secrets` key is not allowed: the platform manages secrets for you. Use the platform's secrets feature and `${secret:NAME}` in `environment`.

#### COMPOSE-SERVICE-SECRETS
Error. A service's `secrets` key is not allowed, for the same reason. Use `${secret:NAME}` in `environment`.

#### COMPOSE-TOP-CONFIGS
Error. The top-level `configs` key is not allowed: configuration files cannot be read from the platform. Bake the file into your image, or pass its content in `environment`.

#### COMPOSE-SERVICE-CONFIGS
Error. A service's `configs` key is not allowed, for the same reason. Bake the file into your image, or pass its content in `environment`.

### Images and builds

#### COMPOSE-IMAGE-INVALID
Error. `image` is not a valid image reference. Write it as `[registry/]name[:tag][@digest]`, for example `ghcr.io/team/api:1.0.0`.

#### COMPOSE-IMAGE-INTERNAL
Error. `image` points at a registry the platform does not allow: `localhost`, private or numeric addresses, names without a domain, internal domains, and the platform's own domains. Push your image to a public registry such as GHCR or Docker Hub.

#### COMPOSE-BUILD
Error. `build` is not allowed: the platform never builds images, and a build's files are never read. Build and push your image to a public registry (GitHub Actions can do it), then reference it with `image`.

#### COMPOSE-PLATFORM
Error. `platform` is not allowed: the platform runs `linux/amd64` images. Build and push a `linux/amd64` image.

#### COMPOSE-PULL-POLICY
Error. `pull_policy` is controlled by the platform. Remove it.

### Dependencies between services

#### COMPOSE-DEPENDS-UNDEFINED
Error. `depends_on` names a service that is not defined. Use the name of a service in this file, or remove the entry.

#### COMPOSE-DEPENDS-CYCLE
Error. Services depend on each other in a loop (`a -> b -> a`). Remove one of the `depends_on` entries in the loop.

#### COMPOSE-DEPENDS-CONDITION
Error. The `depends_on` condition is not allowed. Use `service_started`, `service_healthy` or `service_completed_successfully`.

### Files outside your compose file

The platform never reads any file other than the one you submit.

#### COMPOSE-INCLUDE
Error. `include` is not allowed. Put every service in this one file.

#### COMPOSE-EXTENDS
Error. `extends` is not allowed. Copy the settings you need into this service.

#### COMPOSE-ENV-FILE
Error. `env_file` is not allowed. Use `environment` with literal values, or the platform's secrets feature for private values.

#### COMPOSE-LABEL-FILE
Error. `label_file` is not allowed. Labels are not allowed; remove the key.

### Sharing with other containers or the host

#### COMPOSE-NETWORK-MODE
Error. `network_mode` is not allowed. Remove it. Services reach each other by service name on your group's network.

#### COMPOSE-PID
Error. `pid` is not allowed: sharing a namespace is not permitted. Remove it.

#### COMPOSE-IPC
Error. `ipc` is not allowed: sharing a namespace is not permitted. Remove it.

#### COMPOSE-UTS
Error. `uts` is not allowed: sharing a namespace is not permitted. Remove it.

#### COMPOSE-USERNS-MODE
Error. `userns_mode` is not allowed: sharing a namespace is not permitted. Remove it.

#### COMPOSE-CGROUP
Error. `cgroup` and `cgroup_parent` are not allowed. Remove them.

#### COMPOSE-VOLUMES-FROM
Error. `volumes_from` is not allowed. Declare a named volume at the top level and mount it in each service.

#### COMPOSE-LINKS
Error. `links` and `external_links` are not allowed. Remove them. Services reach each other by service name.

### Extra privileges

#### COMPOSE-PRIVILEGED
Error. `privileged` is not allowed. Remove it.

#### COMPOSE-CAPABILITIES
Error. `cap_add` and `cap_drop` are not allowed. Remove them. The platform sets a fixed capability set.

#### COMPOSE-DEVICES
Error. `devices`, `device_cgroup_rules` and `gpus` are not allowed. Remove them.

#### COMPOSE-SECURITY-OPT
Error. `security_opt` is not allowed. Remove it.

#### COMPOSE-SYSCTLS
Error. `sysctls` is not allowed. Remove it.

#### COMPOSE-RUNTIME
Error. `runtime` and `isolation` are not allowed. Remove them. Only the instructor can change a group's runtime.

#### COMPOSE-OOM
Error. `oom_kill_disable` and `oom_score_adj` are not allowed. Remove them.

#### COMPOSE-USE-API-SOCKET
Error. `use_api_socket` is not allowed: services never get access to the Docker API. Remove it.

### Settings the platform controls

#### COMPOSE-HOSTNAME
Error. `hostname` is not allowed: the platform names containers. Remove it.

#### COMPOSE-LABELS
Error. `labels` is not allowed. Remove it. The platform routes traffic from `x-demo`.

#### COMPOSE-DEPLOY
Error. `deploy` and `scale` are not allowed: the platform assigns resource limits and runs one instance of each service. Remove them.

#### COMPOSE-LOGGING
Error. `logging` is not allowed. Remove it, and log to stdout and stderr.

#### COMPOSE-DEVELOP
Error. `develop` is not allowed. Remove it.

#### COMPOSE-RESOURCE-LIMIT
Error. `mem_limit`, `memswap_limit`, `cpus`, `cpu_shares`, `pids_limit` and `ulimits` are not allowed: the platform assigns resource limits. Remove them. Ask the instructor if your stack needs more than the default.

#### COMPOSE-NETWORK-SETTINGS
Error. `extra_hosts`, `dns`, `dns_search` and `mac_address` are not allowed: the platform controls name resolution and addresses. Remove them.

#### COMPOSE-PROVIDER
Error. `provider` is not allowed: services cannot be delegated to a provider. Run your own image with `image`.

#### COMPOSE-MODELS
Error. `models` is not allowed: the platform does not provide models. Call your model provider from your own code.
