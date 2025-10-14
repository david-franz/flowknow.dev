# Flowknow Frontend

The Flowknow frontend is a Vite + React application that showcases Flowtomic’s knowledge workbench. It allows teams to create, enrich, and monitor knowledge bases that Flowport can attach to Hugging Face inference requests.

## Development

```bash
cd flowknow/frontend
npm install
npm run dev
```

The development server listens on <http://localhost:5174>. By default, all API calls target <http://localhost:8000/api>. Override the backend URL by setting `VITE_API_BASE_URL` in a `.env` file.

## Build

```bash
npm run build
```

Static assets will be emitted to `dist/` and can be deployed alongside the backend or via any static hosting provider.
