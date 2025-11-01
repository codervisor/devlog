#!/bin/bash
# Database setup helper script for devlog application
# This script helps initialize and configure the PostgreSQL database

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if DATABASE_URL is set
check_database_url() {
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL environment variable is not set"
        echo "Please set DATABASE_URL in your .env file or environment"
        echo "Example: DATABASE_URL=\"postgresql://username:password@host:5432/devlog\""
        exit 1
    fi
    print_info "DATABASE_URL is set"
}

# Function to check if database exists
check_database_exists() {
    print_info "Checking if database exists..."
    if psql "$DATABASE_URL" -c '\q' 2>/dev/null; then
        print_info "Database connection successful"
        return 0
    else
        print_error "Cannot connect to database"
        return 1
    fi
}

# Function to run init script
run_init_script() {
    print_info "Running database initialization script..."
    if psql "$DATABASE_URL" -f scripts/database/init-db.sql; then
        print_info "Database initialization completed"
    else
        print_error "Database initialization failed"
        exit 1
    fi
}

# Function to run Prisma migrations
run_prisma_migrations() {
    print_info "Running Prisma migrations..."
    if npx prisma migrate deploy; then
        print_info "Prisma migrations completed"
    else
        print_error "Prisma migrations failed"
        exit 1
    fi
}

# Function to generate Prisma client
generate_prisma_client() {
    print_info "Generating Prisma client..."
    if npx prisma generate; then
        print_info "Prisma client generated"
    else
        print_error "Prisma client generation failed"
        exit 1
    fi
}

# Function to check if TimescaleDB is available
check_timescaledb() {
    print_info "Checking if TimescaleDB is available..."
    if psql "$DATABASE_URL" -c "SELECT * FROM pg_available_extensions WHERE name = 'timescaledb';" -t | grep -q timescaledb; then
        print_info "TimescaleDB is available"
        return 0
    else
        print_warn "TimescaleDB is not available (optional)"
        return 1
    fi
}

# Function to enable TimescaleDB
enable_timescaledb() {
    print_info "Enabling TimescaleDB optimizations..."
    if psql "$DATABASE_URL" -f scripts/enable-timescaledb.sql; then
        print_info "TimescaleDB setup completed"
        print_info "Benefits: 10-20x faster queries, 70-90% storage compression"
    else
        print_error "TimescaleDB setup failed"
        exit 1
    fi
}

# Function to display database info
show_database_info() {
    print_info "Database Information:"
    echo ""
    psql "$DATABASE_URL" -c "SELECT version();" -t
    echo ""
    psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size(current_database())) as database_size;" -t
    echo ""
}

# Main script
main() {
    echo "================================================"
    echo "  Devlog Database Setup Script"
    echo "================================================"
    echo ""

    # Check prerequisites
    check_database_url

    # Check if database exists
    if ! check_database_exists; then
        print_error "Cannot proceed without database connection"
        exit 1
    fi

    # Show database info
    show_database_info

    # Ask user what to do
    echo ""
    echo "What would you like to do?"
    echo "1) Full setup (init + migrations + TimescaleDB if available)"
    echo "2) Initialize database (extensions only)"
    echo "3) Run Prisma migrations only"
    echo "4) Generate Prisma client only"
    echo "5) Enable TimescaleDB only"
    echo "6) Exit"
    echo ""
    read -p "Enter your choice (1-6): " choice

    case $choice in
        1)
            print_info "Starting full database setup..."
            run_init_script
            run_prisma_migrations
            generate_prisma_client
            if check_timescaledb; then
                read -p "Enable TimescaleDB? (y/n): " enable_ts
                if [ "$enable_ts" = "y" ]; then
                    enable_timescaledb
                fi
            fi
            print_info "Full setup completed successfully!"
            ;;
        2)
            run_init_script
            ;;
        3)
            run_prisma_migrations
            ;;
        4)
            generate_prisma_client
            ;;
        5)
            if check_timescaledb; then
                enable_timescaledb
            else
                print_error "TimescaleDB is not available in your PostgreSQL installation"
                exit 1
            fi
            ;;
        6)
            print_info "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac

    echo ""
    echo "================================================"
    echo "  Setup Complete!"
    echo "================================================"
    echo ""
    print_info "Next steps:"
    echo "  - Start your application: pnpm dev:web"
    echo "  - View database: npx prisma studio"
    echo "  - Check migrations: npx prisma migrate status"
}

# Run main function
main
