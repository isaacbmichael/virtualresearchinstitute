# Deployment and Backend Notes

This repository includes the public website and backend-related infrastructure for Virtual Research Institute.

## Backend Overview

The Ask VRI backend uses Cloudflare Workers and Wrangler.

The Worker code is located in:

    src/

The Cloudflare Worker should use environment secrets for private credentials. API keys, private tokens, and other sensitive credentials must never be committed to this repository.

## Required Secret

The following secret is required for the Ask VRI backend:

    OPENAI_API_KEY

Set this in Cloudflare/Wrangler rather than storing it in the repository.

## Optional Environment Variables

The following environment variables may be used depending on the deployment:

    OPENAI_MODEL
    CURRENT_OFFERINGS_URL

## Local Development

Install dependencies:

    npm install

Run the local development server:

    npm run dev

For local development, use a local environment file such as:

    .dev.vars

Do not commit `.dev.vars`, `.dev.vars.*`, `.env`, `.env.*`, API keys, private credentials, or production secrets.

## Setting Production Secrets

Use Wrangler to set production secrets:

    npx wrangler secret put OPENAI_API_KEY

## Deployment

Deploy the Worker/site infrastructure using:

    npm run deploy

## Security Notes

Before launching or advertising Ask VRI broadly, review the backend for:

- API key protection
- allowed origins / CORS settings
- rate limiting or abuse prevention
- error handling
- logging practices
- prompt and response safety
- protection against exposing private configuration

CORS restrictions help with browser-based access, but they should not be treated as the only abuse-prevention measure. Server-side protections such as rate limits, request validation, usage limits, or Cloudflare Turnstile may be needed as usage grows.

## Repository Hygiene

Do not commit:

- `.env` or `.env.*`
- `.dev.vars` or `.dev.vars.*`
- API keys
- Cloudflare account tokens
- OpenAI keys
- private student, parent, mentor, or payment information
- local build artifacts
- generated logs
