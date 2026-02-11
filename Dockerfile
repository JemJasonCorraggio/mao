FROM node:20-alpine AS frontend-builder
WORKDIR /web
COPY web/package*.json ./
RUN npm install
COPY web .
RUN npm run build


FROM golang:1.25-alpine AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o mao ./cmd/server


FROM alpine:latest
WORKDIR /app

COPY --from=backend-builder /app/mao .
COPY --from=frontend-builder /web/dist ./web/dist

EXPOSE 8080

CMD ["./mao"]
