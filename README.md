# Flowknow

Flowknow is the Flowtomic knowledge workbench responsible for ingesting content, generating retrieval-ready databases, and packaging knowledge for Flowport-powered inference gateways.

## Structure

- `frontend/` — Vite + React single-page application for creating and managing knowledge bases.
- Backend requests are served by the shared Flowport FastAPI service located in `flowport/backend`.

Refer to `frontend/README.md` for local development instructions.
