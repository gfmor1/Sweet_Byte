"""Aggregate Lizard's per-function CSV into per-class (per-file) metrics.

Usage: python3 docs/metrics/aggregate.py docs/metrics/<snapshot>/lizard.csv > docs/metrics/<snapshot>/per-class.csv

One row per source file: in Java each file holds one top-level class (nested
classes are counted with their outer class); in JS/JSX the file is the unit.
Files with no functions (interfaces, records, enums without methods) do not
appear, because Lizard reports nothing for them.
"""
import csv
import os
import sys
from collections import defaultdict


def main(path):
    stats = defaultdict(lambda: {"nloc": 0, "ccn": 0, "max_ccn": 0, "max_fn": "", "functions": 0})
    with open(path, newline="") as f:
        for row in csv.reader(f):
            nloc, ccn, file, fn = int(row[0]), int(row[1]), row[6], row[7]
            s = stats[file]
            s["nloc"] += nloc
            s["ccn"] += ccn
            s["functions"] += 1
            if ccn > s["max_ccn"]:
                s["max_ccn"], s["max_fn"] = ccn, fn

    out = csv.writer(sys.stdout)
    out.writerow(["class", "file", "functions", "nloc", "total_ccn", "max_ccn", "max_ccn_function"])
    for file, s in sorted(stats.items(), key=lambda kv: (-kv[1]["ccn"], -kv[1]["nloc"])):
        name = os.path.splitext(os.path.basename(file))[0]
        out.writerow([name, file, s["functions"], s["nloc"], s["ccn"], s["max_ccn"], s["max_fn"]])


if __name__ == "__main__":
    main(sys.argv[1])
