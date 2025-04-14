# Meeting Summarizer

[![Version](https://img.shields.io/badge/version-0.0.1-blue)](package.json)
[![Node Version](https://img.shields.io/badge/node-22.14.0-brightgreen)](.nvmrc)
[![License](https://img.shields.io/badge/License-Not%20Specified-lightgrey)](LICENSE)

Web application using LLMs (OpenAI/Ollama) to generate meeting summaries. Built with Astro, React, and Supabase for backend/auth.

**Note:** No offline mode. Users select download location each time. Errors log to console.

## Tech Stack

*   **Frontend:** Astro, React, Tailwind CSS
*   **Backend/Logic:** TypeScript, Zustand/Context API
*   **LLM:** OpenAI API, Ollama
*   **Data/Auth:** Supabase (PostgreSQL)
*   **Dev Tools:** Vite, ESLint, Prettier

## Getting Started Locally

### Prerequisites

*   **Node.js:** `22.14.0` (use `nvm use`)
*   **Package Manager:** npm, yarn, or pnpm

### Setup

1.  **Clone:** `git clone <your-repository-url> && cd <repository-directory>`
2.  **Install:** `npm install` (or `yarn install` / `pnpm install`)
3.  **Environment:** Create a `.env` file with your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, etc.
4.  **Run Dev:** `npm run dev` (App usually runs at `http://localhost:4321`)

## Available Scripts

*   `npm run dev`: Start development server.
*   `npm run build`: Build for production.
*   `npm run preview`: Preview production build locally.
*   `npm run lint`: Lint code.
*   `npm run format`: Format code.

## Project Status

*   **Status:** In Development
*   **Version:** `0.0.1`

## License

License not specified.