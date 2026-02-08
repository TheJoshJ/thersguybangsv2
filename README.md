# Vite + Hono Template

A minimal full-stack template with React and Hono.

## Features

- **Frontend**: React 19, React Router, Tailwind CSS v4
- **Backend**: Hono with Node.js adapter
- **Build**: Vite with HMR and API proxy
- **Styling**: shadcn/ui compatible

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
├── server/                 # Hono backend
│   ├── routes/             # API routes
│   │   └── index.ts        # Route definitions
│   ├── app.ts              # Hono app configuration
│   └── index.ts            # Server entry point
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── lib/                # Utilities
│   ├── pages/              # Page components
│   ├── App.tsx             # Root component
│   ├── routes.tsx          # Route definitions
│   └── main.tsx            # Entry point
├── vite.config.ts          # Vite configuration
└── package.json
```

## Adding API Routes

Add routes in `server/routes/index.ts`:

```typescript
routes.get("/hello", (c) => {
  return c.json({ message: "Hello!" });
});

routes.post("/data", async (c) => {
  const body = await c.req.json();
  return c.json({ received: body });
});
```

## Adding shadcn/ui Components

```bash
npx shadcn@latest add button
npx shadcn@latest add card
```

## Deployment

### Build

```bash
npm run build
```

### Run Production

```bash
npm run start
```

## License

MIT
