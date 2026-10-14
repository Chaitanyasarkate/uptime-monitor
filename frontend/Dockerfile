FROM node:20-alpine

WORKDIR /app

# Copy files from build context
COPY . .

# If context was repository root, move frontend files into /app
RUN if [ -f "frontend/package.json" ]; then \
      cp -rf frontend/* . && rm -rf backend frontend db; \
    fi

RUN npm install

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
