.PHONY: build build-all clean test install run dev

# Binary name
BINARY_NAME=devlog
VERSION?=0.1.0
BUILD_DIR=bin
RUST_DIR=rust

# Default target
all: clean build

# Build for current platform
build:
	@echo "Building $(BINARY_NAME) for current platform..."
	@mkdir -p $(BUILD_DIR)
	cd $(RUST_DIR) && cargo build --release
	cp $(RUST_DIR)/target/release/devlog-cli $(BUILD_DIR)/$(BINARY_NAME)

# Build for all platforms (requires cross-compilation setup)
build-all: clean
	@echo "Building for all platforms..."
	@mkdir -p $(BUILD_DIR)
	
	@echo "Building for current platform..."
	cd $(RUST_DIR) && cargo build --release
	cp $(RUST_DIR)/target/release/devlog-cli $(BUILD_DIR)/$(BINARY_NAME)
	
	@echo "Build complete! Binary in $(BUILD_DIR)/"
	@ls -lh $(BUILD_DIR)/

# Clean build artifacts
clean:
	@echo "Cleaning..."
	cd $(RUST_DIR) && cargo clean
	@rm -rf $(BUILD_DIR)

# Run tests
test:
	@echo "Running tests..."
	cd $(RUST_DIR) && cargo test

# Install binary to system
install: build
	@echo "Installing $(BINARY_NAME)..."
	@cp $(BUILD_DIR)/$(BINARY_NAME) /usr/local/bin/
	@echo "Installed to /usr/local/bin/$(BINARY_NAME)"

# Run the collector (development)
run:
	@echo "Running $(BINARY_NAME)..."
	cd $(RUST_DIR) && cargo run -- start

# Format code
fmt:
	@echo "Formatting code..."
	cd $(RUST_DIR) && cargo fmt

# Lint code
lint:
	@echo "Linting code..."
	cd $(RUST_DIR) && cargo clippy -- -D warnings

# Show help
help:
	@echo "Devlog - Makefile commands:"
	@echo ""
	@echo "  make build         - Build for current platform"
	@echo "  make build-all     - Build for all platforms"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make test          - Run tests"
	@echo "  make install       - Install to /usr/local/bin"
	@echo "  make run           - Build and run"
	@echo "  make fmt           - Format code"
	@echo "  make lint          - Lint code"
	@echo "  make help          - Show this help"
