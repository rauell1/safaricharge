#!/usr/bin/env python3
"""Prepends a new snapshot row into the ROLLBACK.md Snapshot Log table
and appends a detail section at the bottom. Idempotent — skips if the
branch name already exists in the file."""

import os
import re

sha         = os.environ.get('SHA', '')
sha_short   = os.environ.get('SHA_SHORT', '')
date        = os.environ.get('DATE', '')
subject     = os.environ.get('SUBJECT', '')
branch_name = os.environ.get('BRANCH_NAME', '')

rollback_path = 'ROLLBACK.md'
with open(rollback_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Idempotency check — if this branch is already recorded, do nothing
if branch_name in content:
    print(f'Branch {branch_name} already in ROLLBACK.md — skipping')
    exit(0)

# ── 1. Determine the next snapshot number ──────────────────────────────────
numbers = re.findall(r'^\| (\d+) \|', content, re.MULTILINE)
next_num = max((int(n) for n in numbers), default=0) + 1

# ── 2. Build new table row (prepend = newest first) ────────────────────────
new_row = f'| {next_num} | `{branch_name}` | `{sha_short}` | {subject} | {date} |'

# Insert row just after the table header + separator lines
table_header = '| # | Branch | Pinned Commit | Description | Date |'
separator    = '|---|--------|--------------|-------------|------|'

if table_header in content and separator in content:
    # Find the position right after the separator line
    sep_end = content.index(separator) + len(separator)
    # Insert new row on the next line
    content = content[:sep_end] + '\n' + new_row + content[sep_end:]
else:
    # Fallback: just append
    content += f'\n{new_row}\n'

# ── 3. Append detail section at the bottom ─────────────────────────────────
detail = f"""
---

## Snapshot #{next_num} — `{branch_name}`

- **Branch**: `{branch_name}`
- **Commit**: `{sha}`
- **Subject**: {subject}
- **Date**: {date}
- **Auto-generated**: yes (by update-rollback.yml)
"""

# Remove trailing manual note line temporarily to keep ordering clean
content = content.rstrip()
if content.endswith('*This file is maintained manually after each major change session.*'):
    content = content[:content.rfind('---')].rstrip()
    content += detail
    content += '\n\n---\n\n*This file is maintained manually after each major change session.*\n'
else:
    content += detail

with open(rollback_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'ROLLBACK.md updated — added snapshot #{next_num}: {branch_name} @ {sha_short}')
