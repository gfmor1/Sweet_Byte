# Code metrics (Phase 4)

Raw tool output for each measured snapshot:

| Folder | Snapshot |
|---|---|
| `phase3/` | tag `phase3` (baseline, before any Phase 4 change) |
| `phase4-refactored/` | tag `phase4-refactored` |
| `phase4/` | tag `phase4` |

## Tool and configuration

- Tool: [Lizard](https://github.com/terryyin/lizard) **1.26.1** (installed with `pipx install lizard`)
- Configuration: Lizard defaults (CCN warning threshold 15), languages Java, JavaScript and JSX, `node_modules` excluded, test sources not measured.

The same command is run from the repository root, checked out at each tag:

```bash
git worktree add ../sb-<tag> <tag>
cd ../sb-<tag>
lizard backend/src/main/java FrontEnd -l java -l javascript -l jsx -x "*/node_modules/*" --csv > lizard.csv
lizard backend/src/main/java FrontEnd -l java -l javascript -l jsx -x "*/node_modules/*"       > lizard.txt
```

`lizard.csv` columns (no header row): NLOC, CCN, token count, parameter count, length, location, file, function name, long name, start line, end line.

Lizard exits with code 1 when any function exceeds a warning threshold; this is expected and the output is still complete.
