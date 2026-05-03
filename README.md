# Virtual Research Institute

Website and public-facing technical infrastructure for **Virtual Research Institute (VRI)**.

Virtual Research Institute provides mentored research opportunities in mathematics,
statistics, data science, computational sciences, and related fields.

## About

This repository contains source code, website content, public-facing program materials,
policy materials, research-project pages, design assets, and backend-related
infrastructure for the Virtual Research Institute website.

## Ownership

Copyright © 2026 Virtual Research Institute LLC. All rights reserved.

This repository is proprietary and is not open source. Public availability on GitHub
does not grant permission to copy, modify, distribute, reuse, commercialize, or create
derivative works from the code, content, design, program materials, prompts, data files,
or related materials in this repository.

See [`LICENSE.md`](LICENSE.md) and [`NOTICE.md`](NOTICE.md).

## Repository Structure

- `_data/` — structured site data and public Ask VRI knowledge sources
- `_includes/` — shared site components
- `_layouts/` — shared page templates
- `about/` — About page content and supporting materials
- `assets/` — styles, scripts, images, and public assets
- `docs/` — internal-facing repository documentation
- `for-mentors/` — mentor-facing website pages
- `foundation/` — foundation-related website materials
- `legal/` — public legal and policy-related files
- `policies/` — policy pages and materials
- `programs/` — program and pricing pages
- `questions-and-answers/` — public Q&A materials
- `research-archive/` — research archive pages and assets
- `src/` — backend Worker code
- `upcoming-projects/` — upcoming project pages and proposal content

## Local Development

Install dependencies:

    npm install

Run the local development server:

    npm run dev

## Backend and Deployment

Backend and deployment notes are documented in:

[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

Do not commit API keys, `.env` files, `.dev.vars` files, private credentials, or sensitive student, parent, mentor, payment, or operational information.

## Security

Please do not report security issues through public GitHub issues.

See [`SECURITY.md`](SECURITY.md).

## License

This repository is proprietary. See [`LICENSE.md`](LICENSE.md).
