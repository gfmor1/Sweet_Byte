# Code metrics (Phase 4)

Raw tool output for each measured snapshot:

| Folder | Snapshot |
|---|---|
| `phase3/` | tag `phase3` (baseline, before any Phase 4 change) |
| `phase4-refactored/` | tag `phase4-refactored` (after refactorings R1-R4, before PROMO) |
| `phase4/` | tag `phase4` |

## Tool and configuration

- Tool: [Lizard](https://github.com/terryyin/lizard) **1.26.1** (installed with `pipx install lizard`)
- Configuration: Lizard defaults (CCN warning threshold 15), languages Java, JavaScript and JSX, `node_modules` and `FrontEnd/tests` excluded; backend tests are outside `backend/src/main/java`, so no test code is measured.
- `-x "*/tests/*"` was added when frontend tests first appeared (after `phase3`). Re-running `phase3` with it gives a byte-identical `lizard.csv`, so all snapshots use the same effective configuration.

The same command is run from the repository root, checked out at each tag:

```bash
git worktree add ../sb-<tag> <tag>
cd ../sb-<tag>
lizard backend/src/main/java FrontEnd -l java -l javascript -l jsx -x "*/node_modules/*" -x "*/tests/*" --csv > lizard.csv
lizard backend/src/main/java FrontEnd -l java -l javascript -l jsx -x "*/node_modules/*" -x "*/tests/*" > lizard.txt
```

`lizard.csv` columns (no header row): NLOC, CCN, token count, parameter count, length, location, file, function name, long name, start line, end line.

Lizard exits with code 1 when any function exceeds a warning threshold; this is expected and the output is still complete.

Per-class totals: `python3 docs/metrics/aggregate.py <snapshot>/lizard.csv > <snapshot>/per-class.csv`.
