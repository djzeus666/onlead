FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY index.html vk-callback.html robots.txt ./
COPY server ./server
COPY js ./js
COPY css ./css
COPY admin ./admin
COPY img ./img
COPY scripts ./scripts
ENV PORT=4173 NODE_ENV=production NODE_OPTIONS=--experimental-sqlite
EXPOSE 4173
HEALTHCHECK --interval=20s --timeout=5s --retries=5 --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:4173/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]
