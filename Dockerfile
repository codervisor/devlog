# Multi-stage build for the devlog collector
FROM golang:1.24-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates

WORKDIR /build

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY cmd/ ./cmd/
COPY internal/ ./internal/
COPY pkg/ ./pkg/

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o devlog ./cmd/devlog

# ========================================
# Runtime stage - minimal image
# ========================================
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

# Create non-root user
RUN addgroup -S devlog && adduser -S devlog -G devlog

WORKDIR /app

# Copy binary from builder
COPY --from=builder /build/devlog /app/devlog

# Create config and data directories
RUN mkdir -p /app/data /app/config && \
    chown -R devlog:devlog /app

USER devlog

# Default configuration location
ENV DEVLOG_CONFIG=/app/config/collector.json
ENV DEVLOG_DB_PATH=/app/data/buffer.db

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/app/devlog", "status"]

ENTRYPOINT ["/app/devlog"]
CMD ["start"]
