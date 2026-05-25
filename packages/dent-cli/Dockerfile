# Build and run the Docker container:
# $ docker build -t dent .
#
# Then, to format a file:
# $ docker run --rm -v "$PWD:/data" -w /data dent format --write demo.nsi

FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS install
COPY package.json ./
RUN bun install --production

FROM base
COPY --from=install /app/node_modules ./node_modules
COPY src/ ./src/
COPY package.json ./

ENTRYPOINT ["bun", "run", "src/main.ts"]
