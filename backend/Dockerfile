# ── Stage 1: Build the React frontend ──────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Copy frontend source (handles both root-context and subfolder-context)
COPY . .
RUN if [ -f "frontend/package.json" ]; then \
      cp -rf frontend/. . && rm -rf backend frontend db scripts; \
    fi

RUN npm install
RUN npm run build

# ── Stage 2: Run the Express backend ────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy backend files
COPY . .
RUN if [ -f "backend/package.json" ]; then \
      cp -rf backend/* . && rm -rf backend frontend db; \
    fi

RUN npm install --omit=dev

# Copy the built frontend into /app/public so Express can serve it
COPY --from=frontend-builder /frontend/dist ./public

EXPOSE 4000

CMD ["node", "index.js"]

