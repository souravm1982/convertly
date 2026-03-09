# Next.js Full Stack Application

A modern full-stack application built with Next.js 14, featuring React frontend and Node.js API backend in a single project.

## Features

- **React 18** - Modern React with hooks and latest features
- **Next.js 14** - App Router for file-based routing
- **TypeScript** - Full type safety across frontend and backend
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **API Routes** - Built-in Node.js backend with serverless functions
- **Hot Reload** - Instant feedback during development

## Project Structure

```
/Volumes/workplace
├── app/
│   ├── api/
│   │   └── hello/
│   │       └── route.ts       # API endpoint (Node.js backend)
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout component
│   └── page.tsx               # Home page (React frontend)
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
└── .eslintrc.json
```

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Build for Production

```bash
npm run build
npm start
```

## API Routes

The API backend is located in the `app/api` directory. Each folder with a `route.ts` file becomes an API endpoint.

### Example: `/api/hello`

**GET Request:**
```bash
curl http://localhost:3000/api/hello
```

Response:
```json
{
  "message": "Hello from the Node.js API backend!",
  "timestamp": "2026-02-23T21:27:00.000Z"
}
```

**POST Request:**
```bash
curl -X POST http://localhost:3000/api/hello \
  -H "Content-Type: application/json" \
  -d '{"name": "World"}'
```

## Frontend Development

The frontend uses React Server Components by default. Use the `"use client"` directive for client-side interactivity.

### Adding New Pages

Create a new folder in `app/` with a `page.tsx` file:

```typescript
// app/about/page.tsx
export default function About() {
  return <h1>About Page</h1>;
}
```

This automatically creates a route at `/about`.

## Backend Development

### Adding New API Routes

Create a new folder in `app/api/` with a `route.ts` file:

```typescript
// app/api/users/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ users: [] });
}
```

This creates an endpoint at `/api/users`.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)