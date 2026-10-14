FROM node:20-alpine

WORKDIR /app

# Copy files from build context
COPY . .

# If context was repository root, move backend files into /app
RUN if [ -f "backend/package.json" ]; then \
      cp -rf backend/* . && rm -rf backend frontend db; \
    fi

RUN npm install --omit=dev

EXPOSE 4000

CMD ["node", "index.js"]
