# Vercel Environment Variables

## Required Variables (Do NOT paste actual values here)

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- OPENAI_API_KEY
- DATABASE_URL
- GOOGLE_SHEETS_API_KEY

## Set Variables In:

1. Vercel Dashboard → Project Settings → Environment Variables
2. https://vercel.com/dashboard/[project-name]/settings/environment-variables

## How to Add:

1. Go to project settings
2. Click "Environment Variables"
3. Click "Add New"
4. Enter variable name and value
5. Select which environments (Production, Preview, Development)
6. Click "Save"

## Verification

Run: `vercel env pull` to load into `.env.local` file

## Last Updated

May 10, 2026
