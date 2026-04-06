# Windows Setup Guide

This guide documents the exact setup flow used for this project on Windows so you can repeat it on another PC with fewer surprises.

It covers:

- Node.js
- Python
- Git
- GitHub CLI
- GitHub repo setup
- UI/UX Pro Max Codex skill
- Vercel MCP
- Vercel CLI
- PowerShell fixes for PATH and script policy

Project path used here:

`E:\ads-intel-system\ads-intelligence-system`

## 1. Install Node.js

Install the current LTS version with `winget`:

```powershell
winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
```

Verify:

```powershell
& "C:\Program Files\nodejs\node.exe" -v
& "C:\Program Files\nodejs\npm.cmd" -v
```

Expected example:

- `node`: `v24.14.1`
- `npm`: `11.11.0`

If `node` or `npm` is not recognized, close and reopen PowerShell.

Temporary PATH fix for the current session:

```powershell
$env:Path="C:\Program Files\nodejs;$env:Path"
```

## 2. Install Python

Required for the `ui-ux-pro-max` skill search scripts.

```powershell
winget install --id Python.Python.3.12 -e --accept-package-agreements --accept-source-agreements
```

Verify:

```powershell
& "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312\python.exe" --version
```

On this PC, the full path was:

```powershell
& "C:\Users\hakim\AppData\Local\Programs\Python\Python312\python.exe" --version
```

## 3. Install Git

```powershell
winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements
```

Verify:

```powershell
& "C:\Program Files\Git\cmd\git.exe" --version
```

If `git` is not recognized yet, use:

```powershell
$env:Path="C:\Program Files\Git\cmd;$env:Path"
```

## 4. Install GitHub CLI

```powershell
winget install --id GitHub.cli -e --accept-package-agreements --accept-source-agreements
```

Verify:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" --version
```

If `gh` is not recognized yet, either reopen PowerShell or use:

```powershell
$env:Path="C:\Program Files\GitHub CLI;$env:Path"
```

## 5. Sign In to GitHub

Use the full path if `gh` is not in PATH:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" auth login
```

Verify:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" auth status
```

## 6. Fix Git Safe Directory on Windows

If Git reports:

`fatal: detected dubious ownership in repository`

run:

```powershell
& "C:\Program Files\Git\cmd\git.exe" config --global --add safe.directory "E:/ads-intel-system/ads-intelligence-system"
```

Replace the path with your real project path.

## 7. Configure Git Identity

Example:

```powershell
& "C:\Program Files\Git\cmd\git.exe" config --global user.name "adibhakimie12"
& "C:\Program Files\Git\cmd\git.exe" config --global user.email "adib.hakimi19@gmail.com"
```

Verify:

```powershell
& "C:\Program Files\Git\cmd\git.exe" config --global --get user.name
& "C:\Program Files\Git\cmd\git.exe" config --global --get user.email
```

## 8. Initialize and Push a New GitHub Repo

Inside the project folder:

```powershell
git init -b main
git add .
git commit -m "Initial commit"
```

Create the GitHub repo and push:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" repo create ads-intelligence-system --public --source "E:\ads-intel-system\ads-intelligence-system" --remote origin --push
```

If you want private instead, replace `--public` with `--private`.

## 9. Install the UI/UX Pro Max Skill for Codex

This project used the official CLI-based install path, not a manual copy.

Inside the project root:

```powershell
& "C:\Program Files\nodejs\npx.cmd" uipro-cli init --ai codex
```

This installs the skill into:

`.codex/skills/ui-ux-pro-max`

Important:

- Restart Codex after installing the skill if you want it auto-detected in a fresh session.

## 10. Use the UI/UX Skill Search Scripts

Example design system generation:

```powershell
& "C:\Users\hakim\AppData\Local\Programs\Python\Python312\python.exe" ".\.codex\skills\ui-ux-pro-max\scripts\search.py" "ads intelligence saas sales intelligence dashboard premium professional" --design-system -p "Ads Intelligence System" -f markdown
```

Example UX search:

```powershell
& "C:\Users\hakim\AppData\Local\Programs\Python\Python312\python.exe" ".\.codex\skills\ui-ux-pro-max\scripts\search.py" "responsive dashboard accessibility spacing hierarchy" --domain ux -n 12
```

## 11. Install the Vercel MCP for Codex

The interactive command can fail in non-TTY terminals. Use the non-interactive version:

```powershell
& "C:\Program Files\nodejs\npx.cmd" add-mcp https://mcp.vercel.com --agent codex --name vercel --yes
```

This writes:

`.codex/config.toml`

Expected config:

```toml
[mcp_servers.vercel]
type = "http"
url = "https://mcp.vercel.com"
```

## 12. Install Vercel CLI Globally

On this PC, npm global install initially failed because the Roaming npm folder did not exist.

Create it first:

```powershell
New-Item -ItemType Directory -Force "C:\Users\%USERNAME%\AppData\Roaming\npm" | Out-Null
```

Then install:

```powershell
& "C:\Program Files\nodejs\npm.cmd" install -g vercel@latest
```

Verify the latest published version:

```powershell
& "C:\Program Files\nodejs\npm.cmd" view vercel version
```

## 13. Fix Vercel CLI on PowerShell

Two common Windows issues happened here:

### A. `node` not recognized

Fix current session:

```powershell
$env:Path="C:\Program Files\nodejs;C:\Users\hakim\AppData\Roaming\npm;$env:Path"
```

### B. `vercel.ps1` blocked by execution policy

Use the `.cmd` wrapper directly:

```powershell
& "C:\Users\hakim\AppData\Roaming\npm\vercel.cmd" --version
```

Optional alias for the current PowerShell session:

```powershell
Set-Alias vercel "C:\Users\hakim\AppData\Roaming\npm\vercel.cmd"
```

After that:

```powershell
vercel --version
```

Expected example:

- `Vercel CLI 50.39.0`

## 14. Sign In to Vercel

```powershell
vercel login
```

Verify:

```powershell
vercel whoami
```

If `vercel` is still blocked, use:

```powershell
& "C:\Users\hakim\AppData\Roaming\npm\vercel.cmd" login
& "C:\Users\hakim\AppData\Roaming\npm\vercel.cmd" whoami
```

## 15. Run the Project Locally

Inside the project:

```powershell
$env:Path="C:\Program Files\nodejs;$env:Path"
& "C:\Program Files\nodejs\npm.cmd" run dev
```

If needed, run detached or reopen a fresh PowerShell after Node install.

Expected local app URL from this project:

- `http://localhost:3000`

## 16. Build Check

Before deployment:

```powershell
$env:Path="C:\Program Files\nodejs;$env:Path"
& "C:\Program Files\nodejs\npm.cmd" run build
```

## 17. Recommended Order on a New PC

Use this order:

1. Install Node.js
2. Install Python
3. Install Git
4. Install GitHub CLI
5. Reopen PowerShell
6. Authenticate GitHub
7. Set Git name and email
8. Clone or open the project
9. Fix `safe.directory` if Git warns
10. Install the `ui-ux-pro-max` skill
11. Install Vercel MCP
12. Install Vercel CLI
13. Log in to Vercel
14. Run `npm install` if dependencies are missing
15. Run `npm run dev`
16. Run `npm run build`

## 18. Common Windows Problems and Fixes

### `node` / `npm` / `npx` not recognized

Use:

```powershell
$env:Path="C:\Program Files\nodejs;$env:Path"
```

### `gh` not recognized

Use:

```powershell
$env:Path="C:\Program Files\GitHub CLI;$env:Path"
```

### `git` not recognized

Use:

```powershell
$env:Path="C:\Program Files\Git\cmd;$env:Path"
```

### `vercel` blocked by PowerShell execution policy

Use:

```powershell
& "C:\Users\hakim\AppData\Roaming\npm\vercel.cmd" --version
```

### `add-mcp` fails with TTY errors

Use non-interactive flags:

```powershell
& "C:\Program Files\nodejs\npx.cmd" add-mcp https://mcp.vercel.com --agent codex --name vercel --yes
```

### `git` says dubious ownership

Use:

```powershell
& "C:\Program Files\Git\cmd\git.exe" config --global --add safe.directory "<your-project-path>"
```

## 19. Useful Verification Commands

```powershell
& "C:\Program Files\nodejs\node.exe" -v
& "C:\Program Files\nodejs\npm.cmd" -v
& "C:\Program Files\Git\cmd\git.exe" --version
& "C:\Program Files\GitHub CLI\gh.exe" auth status
& "C:\Users\hakim\AppData\Roaming\npm\vercel.cmd" --version
& "C:\Users\hakim\AppData\Roaming\npm\vercel.cmd" whoami
```

## 20. Notes

- The `ui-ux-pro-max` skill was installed at the project level, so it lives in this repo’s `.codex` folder.
- The Vercel MCP was also installed at the project level in `.codex/config.toml`.
- On a new PC, reopening PowerShell after installs usually prevents most PATH confusion.
- On Windows, `.cmd` wrappers are often more reliable than plain commands in locked-down PowerShell environments.
