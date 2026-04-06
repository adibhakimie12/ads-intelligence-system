# Windows Setup Guide

This guide documents the exact setup flow used for this project on Windows so you can repeat it on another PC with fewer surprises.

## Read This First

For this PC:

- The project can stay on the external HDD at `E:\ads-intel-system\ads-intelligence-system`
- The Codex executable and config live on `C:`
- That is normal and supported

When running commands in PowerShell:

- Type or paste only the command itself
- Do not paste the `PS E:\...>` prompt
- Do not paste continuation markers like `>>`
- Do not paste error output lines starting with `+`

Correct example:

```powershell
codex mcp list
```

Wrong example:

```powershell
PS E:\ads-intel-system> codex mcp list
>> 
+ codex mcp list
```

MCP note:

- Seeing `supabase` in `codex mcp list` means Codex on this PC is configured to talk to Supabase
- In this setup, the recommended Supabase MCP path is the hosted project-scoped URL plus OAuth login
- In this repo, app configuration still comes from local files like `E:\ads-intel-system\ads-intelligence-system\.env`

## Supabase Env Values

This repo expects these values in `.env`:

```env
VITE_SUPABASE_URL=https://jadhjjsrftkgzbclqepc.supabase.co
VITE_SUPABASE_ANON_KEY=your-frontend-key
SUPABASE_URL=https://jadhjjsrftkgzbclqepc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
```

Current project ref on this PC:

`jadhjjsrftkgzbclqepc`

Where to get them in the Supabase dashboard:

1. Open your project in Supabase.
2. Go to `Connect` for the quick copy values, or go to `Settings` -> `API Keys` for the full key list.
3. Copy the project URL into `VITE_SUPABASE_URL`.
4. Copy the `anon` key into `VITE_SUPABASE_ANON_KEY`.
5. Copy the `service_role` key into `SUPABASE_SERVICE_ROLE_KEY`.

Important:

- `VITE_SUPABASE_ANON_KEY` is safe for the frontend and is expected by this repo's current code.
- A Supabase publishable frontend key also works here even though the env var is still named `VITE_SUPABASE_ANON_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY` is highly sensitive and must stay server-side only.
- If your Supabase dashboard shows the newer publishable/secret key format first, use the legacy `anon` and `service_role` values for this codebase unless you also update the app code.

## Supabase MCP

For this project, the working Codex MCP setup is:

```powershell
codex mcp add supabase --url https://mcp.supabase.com/mcp?project_ref=jadhjjsrftkgzbclqepc
```

If `codex` is not recognized in PowerShell on this PC, use:

```powershell
& "C:\Users\hakim\AppData\Local\Programs\Antigravity\bin\codex.cmd" mcp add supabase --url https://mcp.supabase.com/mcp?project_ref=jadhjjsrftkgzbclqepc
```

Enable the remote MCP client in `C:\Users\hakim\.codex\config.toml`:

```toml
[mcp]
remote_mcp_client_enabled = true

[mcp_servers.supabase]
url = "https://mcp.supabase.com/mcp?project_ref=jadhjjsrftkgzbclqepc"
```

Authenticate:

```powershell
codex mcp login supabase
```

Or with the full launcher path:

```powershell
& "C:\Users\hakim\AppData\Local\Programs\Antigravity\bin\codex.cmd" mcp login supabase
```

Verify:

```powershell
codex mcp list
```

Expected result:

- `supabase`
- URL `https://mcp.supabase.com/mcp?project_ref=jadhjjsrftkgzbclqepc`
- `Auth` shows `OAuth`

Important:

- The older bearer-token fallback is not the primary setup anymore for this machine.
- The project-scoped hosted MCP plus OAuth is now configured and working.
- The local `.env` can be partially prefilled from the project ref:
  `VITE_SUPABASE_URL=https://jadhjjsrftkgzbclqepc.supabase.co`
  and `SUPABASE_URL=https://jadhjjsrftkgzbclqepc.supabase.co`
- The remaining manual secret is `SUPABASE_SERVICE_ROLE_KEY`.

## Supabase Snippets From Docs

Be careful with copy-paste snippets from Supabase starters.

This repo is:

- Vite frontend
- Express/server API files
- already using `@supabase/supabase-js`

This repo is not:

- Next.js App Router
- using `page.tsx` server components
- using `@supabase/ssr` middleware helpers
- using `NEXT_PUBLIC_SUPABASE_URL` env names

So if you see starter code like:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `utils/supabase/middleware.ts`
- `page.tsx` with `cookies()` from `next/headers`

do not apply it directly to this project.

For this repo:

- keep `VITE_SUPABASE_URL`
- keep `VITE_SUPABASE_ANON_KEY`
- keep `SUPABASE_SERVICE_ROLE_KEY`
- use `src/services/supabase.ts` for the frontend client
- use `api/_lib/supabase-admin.js` for server-side access

Package note:

- `@supabase/supabase-js` is already installed in this project, so you do not need to run `npm install @supabase/supabase-js` again unless you are intentionally upgrading it.

## App Login

This app does not include a default seeded email/password account in the frontend code.

Current admin/test email on this PC:

`adib.hakimi19@gmail.com`

Role note:

- this project currently supports only `owner`, `admin`, and `member`
- there is no built-in `superadmin` role in the current schema
- the closest current equivalent is making the user the `owner` of their workspace

Use one of these paths:

1. Create a new account in the app using the `Create Account` flow.
2. Sign in with an email/password you already created in this Supabase project.
3. Use `Continue in demo mode` if you only want to preview the UI without real auth.

Notes:

- If sign-up is enabled in Supabase, creating an account in the app is the normal first login path.
- Depending on your Supabase auth settings, you may need to confirm the account from your email before sign-in works.

If email confirmation opens a broken page:

1. Open Supabase dashboard.
2. Go to `Authentication` -> `URL Configuration`.
3. Set `Site URL` to `http://localhost:3000`.
4. Add `http://localhost:3000/**` to the redirect URL allow list.

If you want the easiest local test flow:

1. Go to `Authentication` -> `Providers` -> `Email`.
2. Turn off `Confirm email`.
3. Save.

That lets sign-up log in immediately during local testing.

Google login option:

- this app now supports `Continue With Google`
- to make it work, enable Google in `Supabase` -> `Authentication` -> `Providers` -> `Google`
- set the Supabase auth URL settings to include `http://localhost:3000`
- for new Google users, the signup trigger will still create the first workspace automatically after the migrations are installed

If Google sign-in shows:

`Unsupported provider: provider is not enabled`

that means Google login is not turned on yet in Supabase.

Fix:

1. Open Supabase dashboard.
2. Open project `jadhjjsrftkgzbclqepc`.
3. Go to `Authentication` -> `Sign In / Providers`.
4. Turn `Enable sign in with Google` on.
5. Save.

Also make sure `Authentication` -> `URL Configuration` includes:

- `Site URL`: `http://localhost:3000`
- Redirect allow list: `http://localhost:3000/**`

If you do not see a menu literally named `Providers`:

- Supabase's newer dashboard labels it `Sign In / Providers`
- that is the correct place

What to put in Google `Client IDs`:

- do not type your app name there
- it must be a real Google OAuth Client ID
- it usually looks like:
  `123456789012-abcdefg123456.apps.googleusercontent.com`

Best setup for this project:

1. In Google Cloud, create one `OAuth client ID`
2. Choose `Web application`
3. Add Authorized JavaScript origin:
   `http://localhost:3000`
4. Add Authorized redirect URI:
   `https://jadhjjsrftkgzbclqepc.supabase.co/auth/v1/callback`
5. Copy the generated `Client ID`
6. Copy the generated `Client Secret`
7. Paste those two values into Supabase `Authentication` -> `Sign In / Providers` -> `Google`

If you only have one web app, use only one Client ID.

If Google shows `Error 400: redirect_uri_mismatch`:

- the Google Cloud OAuth app does not have the exact callback URL added
- the redirect URI must match exactly, character for character

Use this exact Authorized redirect URI in Google Cloud:

```text
https://jadhjjsrftkgzbclqepc.supabase.co/auth/v1/callback
```

Do not use:

- `http://localhost:3000`
- `http://localhost:3000/**`
- any URL ending in `/callback/` with an extra slash
- any typo in the Supabase project domain

## No Workspace Was Found For This Account

If the app shows:

`No workspace was found for this account`

that usually means:

- the Supabase workspace migrations were not applied yet
- the signup trigger was missing when this user was created
- the user account was created before the workspace bootstrap SQL existed

Fix it in this order:

1. Apply the required Supabase migrations:
   - `supabase/migrations/0001_workspace_foundation.sql`
   - `supabase/migrations/0002_signup_workspace_bootstrap.sql`
2. Sign out of the app.
3. Delete the test user from Supabase Auth, or create a brand new user.
4. Sign up again through the app so the trigger can create:
   - the workspace
   - the workspace owner membership
   - the placeholder `meta_connections` row

If you keep the old user without recreating it, that user will still not have a workspace unless you insert the rows manually.

For the current admin/test email `adib.hakimi19@gmail.com`:

- if that account was created before the migrations and signup trigger existed, delete it from Supabase Auth and sign up again
- or manually create the workspace and membership rows for that user in Supabase

If login still shows `No workspace was found for this account` after you already ran the SQL:

- do not keep clicking `Login`
- the old user account is still missing its workspace
- go to `Supabase` -> `Authentication` -> `Users`
- delete `adib.hakimi19@gmail.com`
- go back to the app
- use `Create Account` again with `adib.hakimi19@gmail.com`

Important:

- the workspace is created during signup by the trigger
- logging in with the old account will not create the missing workspace

If the browser console shows:

`infinite recursion detected in policy for relation "workspace_members"`

that means the original workspace membership helper function needs to be updated.

Fix:

1. Open [0001_workspace_foundation.sql](E:/ads-intel-system/ads-intelligence-system/supabase/migrations/0001_workspace_foundation.sql)
2. Re-copy the latest version from this repo
3. Run it again in the Supabase SQL Editor

The updated version makes `public.is_workspace_member(...)` a `security definer` function so the membership policy does not recurse into itself.

If Supabase SQL Editor says:

`type "plan_tier" already exists`

that means you already ran the original schema once.

Do not rerun the whole `0001_workspace_foundation.sql` file.

Instead, run only the repair SQL for the helper function and the related policy:

```sql
create or replace function public.is_workspace_member(check_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = check_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

drop policy if exists "workspace members can view memberships" on public.workspace_members;
create policy "workspace members can view memberships"
on public.workspace_members
for select
using (public.is_workspace_member(workspace_id));
```

If the recursion error still continues after that, also run this repair SQL:

```sql
create or replace function public.is_workspace_admin_or_owner(check_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = check_workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  );
$$;

drop policy if exists "owners and admins can manage memberships" on public.workspace_members;
create policy "owners and admins can manage memberships"
on public.workspace_members
for all
using (public.is_workspace_admin_or_owner(workspace_id))
with check (public.is_workspace_admin_or_owner(workspace_id));
```

If the app does not show the login screen:

- you are probably still signed in with the old broken user session
- the app sees that session and tries to load the workspace immediately
- that is why it jumps straight to the workspace error instead of showing login

Fix:

1. In Supabase, delete the old user from `Authentication` -> `Users`
2. In the browser, clear the app session:
   - open `http://localhost:3000`
   - clear site data for localhost, or use an Incognito window
3. Refresh the page
4. Then create the account again

App convenience fix on this PC:

- the `No workspace was found for this account` screen now includes a `Sign Out` button
- use it to return to the login screen instead of manually clearing the session first

How to run the two SQL files in Supabase:

1. Open Supabase in your browser.
2. Open project `jadhjjsrftkgzbclqepc`.
3. Click `SQL Editor`.
4. Click `New query`.
5. Open [0001_workspace_foundation.sql](E:/ads-intel-system/ads-intelligence-system/supabase/migrations/0001_workspace_foundation.sql) on your PC.
6. Copy everything from that file and paste it into the SQL Editor.
7. Click `Run`.
8. Open another `New query`.
9. Open [0002_signup_workspace_bootstrap.sql](E:/ads-intel-system/ads-intelligence-system/supabase/migrations/0002_signup_workspace_bootstrap.sql) on your PC.
10. Copy everything from that file and paste it into the SQL Editor.
11. Click `Run`.
12. After both succeed, go to `Authentication` -> `Users`, delete `adib.hakimi19@gmail.com`, then sign up again in the app.

If the markdown file link opens a broken browser page:

- do not use that browser tab
- open the file from the VS Code Explorer panel instead
- go to `ads-intelligence-system` -> `supabase` -> `migrations`
- open `0001_workspace_foundation.sql`
- then open `0002_signup_workspace_bootstrap.sql`

Remote migration note for this PC:

- `npx supabase` works here even though `supabase` is not globally installed
- pushing hosted migrations still requires access to the remote database
- the Supabase CLI also requires a Supabase personal access token in the `sbp_...` format for commands like `supabase link`
- the normal CLI path is:

```powershell
setx SUPABASE_ACCESS_TOKEN "sbp_your_personal_access_token"
& "C:\Program Files\nodejs\npx.cmd" supabase link --project-ref jadhjjsrftkgzbclqepc --password "your-db-password"
& "C:\Program Files\nodejs\npx.cmd" supabase db push
```

- if you do not want to use the CLI password flow, run these SQL files manually in the Supabase SQL Editor in order:
  `supabase/migrations/0001_workspace_foundation.sql`
  `supabase/migrations/0002_signup_workspace_bootstrap.sql`
- the MCP OAuth login and the Supabase CLI personal access token are not the same thing

It covers:

- Node.js
- Python
- Git
- GitHub CLI
- Codex CLI path
- GitHub repo setup
- UI/UX Pro Max Codex skill
- Vercel MCP
- Supabase MCP
- Vercel CLI
- Supabase migrations
- PowerShell fixes for PATH and script policy

Project path used here:

`E:\ads-intel-system\ads-intelligence-system`

Codex executable path on this PC:

`C:\Users\hakim\.antigravity\extensions\openai.chatgpt-26.325.31654-win32-x64\bin\windows-x86_64\codex.exe`

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

Permanent PATH fix for this PC:

```powershell
$nodeDir = "C:\Program Files\nodejs"
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$nodeDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$userPath;$nodeDir", "User")
}
```

Then close and reopen PowerShell.

More reliable permanent fix on this PC:

Create an `npm.cmd` shim inside the Antigravity `bin` folder, which is already on your PATH:

```powershell
@'
@echo off
"C:\Program Files\nodejs\npm.cmd" %*
'@ | Set-Content "C:\Users\hakim\AppData\Local\Programs\Antigravity\bin\npm.cmd"
```

Then open a new PowerShell window and verify:

```powershell
npm -v
```

Also create a `node.cmd` shim so nested npm scripts can still find `node`:

```powershell
@'
@echo off
"C:\Program Files\nodejs\node.exe" %*
'@ | Set-Content "C:\Users\hakim\AppData\Local\Programs\Antigravity\bin\node.cmd"
```

If `npm run dev` says it cannot find `package.json`:

- you are in the wrong folder
- this app does not live in `E:\ads-intel-system`
- it lives in `E:\ads-intel-system\ads-intelligence-system`

Use:

```powershell
cd E:\ads-intel-system\ads-intelligence-system
npm run dev
```

Convenience setup on this PC:

- a root-level [package.json](E:/ads-intel-system/package.json) wrapper was added
- so `npm run dev` can also be run from `E:\ads-intel-system`
- it forwards into `E:\ads-intel-system\ads-intelligence-system`

If `npm run dev` still fails with:

`"node" is not recognized as an internal or external command`

that usually means Node is installed but the current PowerShell session still has the old PATH.

Use:

```powershell
$env:Path="C:\Program Files\nodejs;$env:Path"
& "C:\Program Files\nodejs\npm.cmd" run dev
```

Using `npm.cmd` is often more reliable than plain `npm` on Windows PowerShell.

If Codex or another tool opens a fresh shell that still misses Node, the same session fix applies there too:

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

## 11.1 Codex CLI on This PC

If `codex` is not recognized in PowerShell, use the full executable path on this machine:

```powershell
& "C:\Users\hakim\.antigravity\extensions\openai.chatgpt-26.325.31654-win32-x64\bin\windows-x86_64\codex.exe" --help
```

Useful examples:

```powershell
& "C:\Users\hakim\.antigravity\extensions\openai.chatgpt-26.325.31654-win32-x64\bin\windows-x86_64\codex.exe" mcp list
& "C:\Users\hakim\.antigravity\extensions\openai.chatgpt-26.325.31654-win32-x64\bin\windows-x86_64\codex.exe" mcp get supabase
```

Temporary PATH fix for the current PowerShell session:

```powershell
$env:Path="C:\Users\hakim\.antigravity\extensions\openai.chatgpt-26.325.31654-win32-x64\bin\windows-x86_64;$env:Path"
codex --help
```

If `codex.exe` works by full path but `codex` still does not, re-run the PATH line in the current PowerShell window before using the short command name:

```powershell
$env:Path="C:\Users\hakim\.antigravity\extensions\openai.chatgpt-26.325.31654-win32-x64\bin\windows-x86_64;$env:Path"
codex mcp list
```

Optional convenience alias for the current session:

```powershell
Set-Alias codex "C:\Users\hakim\.antigravity\extensions\openai.chatgpt-26.325.31654-win32-x64\bin\windows-x86_64\codex.exe"
codex mcp list
```

More reliable permanent fix on this PC:

Create a `codex.cmd` shim inside the Antigravity `bin` folder, which is already on your user PATH:

```powershell
@'
@echo off
"C:\Users\hakim\.antigravity\extensions\openai.chatgpt-26.325.31654-win32-x64\bin\windows-x86_64\codex.exe" %*
'@ | Set-Content "C:\Users\hakim\AppData\Local\Programs\Antigravity\bin\codex.cmd"
```

Then open a new PowerShell window and verify:

```powershell
codex mcp list
```

Important when copying commands into PowerShell:

- Copy only the command itself.
- Do not paste the `PS E:\...>` prompt text.
- Do not paste error transcript lines that start with `+` or `>>`.

Correct:

```powershell
codex mcp list
```

Permanent user PATH fix:

```powershell
$codexDir = "C:\Users\hakim\.antigravity\extensions\openai.chatgpt-26.325.31654-win32-x64\bin\windows-x86_64"
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$codexDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$userPath;$codexDir", "User")
}
```

After the permanent PATH update, close and reopen PowerShell and then verify:

```powershell
codex --help
codex mcp list
```

If you still get `The term 'codex' is not recognized`, bypass PATH and run the executable directly:

```powershell
& "C:\Users\hakim\.antigravity\extensions\openai.chatgpt-26.325.31654-win32-x64\bin\windows-x86_64\codex.exe" mcp list
```

## 11.2 Install the Supabase MCP for Codex

Use the full Codex path if `codex` is not recognized:

```powershell
& "C:\Users\hakim\.antigravity\extensions\openai.chatgpt-26.325.31654-win32-x64\bin\windows-x86_64\codex.exe" mcp add supabase --url https://mcp.supabase.com/mcp --bearer-token-env-var SUPABASE_ACCESS_TOKEN
```

Expected config in `C:\Users\hakim\.codex\config.toml`:

```toml
[mcp_servers.supabase]
url = "https://mcp.supabase.com/mcp"
bearer_token_env_var = "SUPABASE_ACCESS_TOKEN"
```

Set your Supabase personal access token:

```powershell
setx SUPABASE_ACCESS_TOKEN "your-real-supabase-personal-access-token"
```

Important:

- `setx` writes the token to your Windows user environment.
- Your current PowerShell session will usually not see it yet.
- Close and reopen PowerShell before testing `codex mcp list`.

Then reopen PowerShell and verify:

```powershell
& "C:\Users\hakim\.antigravity\extensions\openai.chatgpt-26.325.31654-win32-x64\bin\windows-x86_64\codex.exe" mcp list
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

Before starting the app, install dependencies if needed:

```powershell
$env:Path="C:\Program Files\nodejs;$env:Path"
& "C:\Program Files\nodejs\npm.cmd" install
```

If you want the latest Settings page to save workspace preferences correctly, apply the latest Supabase migration first:

`supabase/migrations/0008_creative_metric_expansion.sql`

Example:

```powershell
supabase db push
```

If the Supabase CLI is not set up locally yet, run that SQL manually in the Supabase dashboard.

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
& "C:\Program Files\nodejs\npm.cmd" install
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
15. Apply Supabase migrations
16. Run `npm run dev`
17. Run `npm run build`

## 18. Common Windows Problems and Fixes

### `node` / `npm` / `npx` not recognized

Use:

```powershell
$env:Path="C:\Program Files\nodejs;$env:Path"
```

If the problem continues, use the Windows command wrappers directly:

```powershell
& "C:\Program Files\nodejs\npm.cmd" -v
& "C:\Program Files\nodejs\npx.cmd" --version
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

### Settings page saves do not persist

Make sure the latest Supabase migration has been applied:

```powershell
supabase db push
```

The current app expects the latest migrations, including:

- `supabase/migrations/0005_workspace_settings.sql`
- `supabase/migrations/0008_creative_metric_expansion.sql`

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
- The current settings page saves non-secret workspace preferences in Supabase, but AI API keys are intentionally kept local in the browser until a secure server-side secret storage flow is added.
