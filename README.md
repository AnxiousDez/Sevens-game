# Sevens — multiplayer card game

React + Vite frontend, Node + Socket.io backend.

## Local development

```bash
# Terminal 1 — backend
cd backend
npm install
npm run dev

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (use the **Network** address for phones on the same Wi‑Fi).

## Deploy

See env templates: `backend/.env.example`, `frontend/.env.example`.

- **Frontend:** Vercel or Netlify (`frontend/`, build `npm run build`, output `dist`)
- **Backend:** Railway or Render (`backend/`, start `npm start`)
- **Redis:** Upstash → set `REDIS_URL` on the backend

Set `VITE_SERVER_URL` on the frontend and `CLIENT_ORIGIN` on the backend to your production URLs.
