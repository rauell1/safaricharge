#!/usr/bin/env python3
"""Auto-regenerates README.md, preserving the hand-written content sections
and updating only the dynamic metadata block at the top."""

import os
import re

repo        = os.environ.get('REPO', 'rauell1/safaricharge')
last_commit = os.environ.get('LAST_COMMIT', '')
last_short  = os.environ.get('LAST_COMMIT_SHORT', '')
last_author = os.environ.get('LAST_AUTHOR', '')
last_date   = os.environ.get('LAST_DATE', '')
last_msg    = os.environ.get('LAST_MESSAGE', '')
total_commits = os.environ.get('TOTAL_COMMITS', '')
total_ts    = os.environ.get('TOTAL_TS', '')

# CI badge + metadata banner injected just below the top-level heading
BANNER = f"""![CI](https://github.com/{repo}/actions/workflows/ci.yml/badge.svg)

<!-- AUTO-UPDATED: do not edit this block manually -->
| | |
|---|---|
| **Last commit** | [`{last_short}`](https://github.com/{repo}/commit/{last_commit}) by {last_author} |
| **Date** | {last_date} |
| **Message** | {last_msg} |
| **Total commits** | {total_commits} |
| **TypeScript files** | {total_ts} |
<!-- END AUTO-UPDATED -->
"""

readme_path = 'README.md'
with open(readme_path, 'r') as f:
    content = f.read()

# Remove any existing auto-updated block (between the markers)
cleaned = re.sub(
    r'!\[CI\].*?<!-- END AUTO-UPDATED -->\n?',
    '',
    content,
    flags=re.DOTALL
)

# Insert banner right after the first top-level heading line
lines = cleaned.split('\n')
insert_at = 0
for i, line in enumerate(lines):
    if line.startswith('# '):
        insert_at = i + 1
        break

lines.insert(insert_at, '')
lines.insert(insert_at + 1, BANNER.rstrip())
lines.insert(insert_at + 2, '')

with open(readme_path, 'w') as f:
    f.write('\n'.join(lines))

print(f'README.md updated — commit {last_short} by {last_author}')
