# Step 3 Workspace Connection Guide

This document explains Step 3 of the SaaS build:

- connect authentication to the workspace schema for real
- create the first workspace automatically on signup
- load the current workspace from Supabase instead of hardcoded demo state

## What Step 3 Adds

Step 2 gave the project:

- workspace types
- workspace context shape
- Supabase tenant schema

Step 3 moves that toward real product behavior by adding:

- signup with `workspace_name`
- automatic workspace bootstrap on new users
- frontend workspace loading from Supabase
- fallback demo mode when Supabase is not configured

## Files Added or Updated

### Signup flow updated

[AuthContext.tsx](e:\ads-intel-system\ads-intelligence-system\src\context\AuthContext.tsx)

Changes:

- `signUp` now accepts `workspaceName`
- signup sends `workspace_name` into Supabase user metadata

### Auth UI updated

[AuthScreen.tsx](e:\ads-intel-system\ads-intelligence-system\src\components\AuthScreen.tsx)

Changes:

- sign-up mode now asks for `Workspace Name`
- this becomes the initial workspace name used during bootstrap

### Workspace context upgraded

[WorkspaceContext.tsx](e:\ads-intel-system\ads-intelligence-system\src\context\WorkspaceContext.tsx)

Changes:

- loads workspace memberships from Supabase when configured
- resolves current workspace from stored or first available membership
- loads `meta_connections` for the current workspace
- falls back to demo workspace only when demo mode is active

### App gating updated

[App.tsx](e:\ads-intel-system\ads-intelligence-system\src\App.tsx)

Changes:

- shows workspace loading state
- shows a helpful message if user exists but no workspace record is found

### SQL bootstrap migration added

[0002_signup_workspace_bootstrap.sql](e:\ads-intel-system\ads-intelligence-system\supabase\migrations\0002_signup_workspace_bootstrap.sql)

This migration:

- adds `slugify`
- creates `handle_new_user_workspace`
- creates an `auth.users` trigger
- creates first workspace automatically
- creates owner membership automatically
- creates placeholder `meta_connections` row automatically

## How The Signup Flow Works Now

1. Customer chooses `Create Account`
2. Customer enters:
   - workspace name
   - email
   - password
3. Frontend sends `workspace_name` in user metadata to Supabase Auth
4. Supabase creates the auth user
5. Trigger runs on `auth.users`
6. Trigger creates:
   - workspace
   - workspace_members owner row
   - meta_connections placeholder row
7. Frontend loads workspace membership and resolves `currentWorkspace`

## What You Need To Do In Supabase

You still need to apply the migration files in your Supabase project.

Required migrations:

- [0001_workspace_foundation.sql](e:\ads-intel-system\ads-intelligence-system\supabase\migrations\0001_workspace_foundation.sql)
- [0002_signup_workspace_bootstrap.sql](e:\ads-intel-system\ads-intelligence-system\supabase\migrations\0002_signup_workspace_bootstrap.sql)

If you are using the Supabase SQL editor, run them in order.

## Required Environment Variables

Set these in your app environment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

They are already documented in:

[.env.example](e:\ads-intel-system\ads-intelligence-system\.env.example)

## Expected Behavior After Setup

When Supabase is configured and the SQL is applied:

- new users can sign up
- each new user gets a workspace automatically
- each new user becomes owner of that workspace
- the app loads the workspace instead of showing the demo-only shell

## Failure Case To Watch For

If a user signs in and sees:

`No workspace was found for this account`

it usually means one of these happened:

- migrations were not run in Supabase
- the trigger failed
- the user was created before the trigger existed

In that case:

- apply migrations
- delete and recreate the test user, or
- manually insert workspace + membership rows for that user

## What This Step Does Not Do Yet

This step still does not implement:

- Meta OAuth
- ad account selection
- real sync pipeline
- workspace creation for additional workspaces beyond signup

Those are still ahead.

## Recommended Next Step

Step 4 should be:

- build the real `Connect Meta Ads` flow
- add OAuth start route
- add callback route
- store Meta token in `meta_connections`
- show connected/disconnected states in Settings

## Summary

Step 3 turns auth into a real tenant-aware entry flow:

- users sign up with a workspace name
- workspace is created automatically
- owner membership is created automatically
- frontend loads that workspace from Supabase

That makes the app structurally ready for per-customer Meta OAuth next.
