#!/bin/bash
# Imari — Setup script
# Runs initial environment setup, database migration, and seed data

set -e

echo "🚀 Imari Setup Script"
echo "===================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check for required tools
check_tools() {
    log_info "Checking required tools..."
    
    for tool in node npm; do
        if ! command -v $tool &> /dev/null; then
            log_error "$tool is not installed. Please install Node.js 20 LTS and npm first."
            exit 1
        fi
    done
    
    log_info "All required tools are available."
}

# Setup backend
setup_backend() {
    log_info "Setting up backend..."
    cd backend
    
    # Install dependencies
    log_info "Installing backend dependencies..."
    npm install
    
    # Check .env exists
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            log_info "Creating .env from example..."
            cp .env.example .env
            log_warn "Please edit backend/.env with your configuration before running the app."
        else
            log_error "No .env.example found in backend/"
            exit 1
        fi
    fi
    
    # Run database migrations
    log_info "Running database migrations..."
    npm run db:migrate 2>/dev/null || \
    npx tsx scripts/migrate.ts 2>/dev/null || \
    log_warn "DB migrate skipped or failed - ensure PostgreSQL is running"
    
    # Seed reference data
    log_info "Seeding reference data..."
    npm run db:seed 2>/dev/null || \
    npx tsx scripts/seed.ts 2>/dev/null || \
    log_warn "DB seed skipped or failed"
    
    cd ..
    log_info "Backend setup complete."
}

# Setup frontend
setup_frontend() {
    log_info "Setting up frontend..."
    cd frontend
    
    # Install dependencies
    log_info "Installing frontend dependencies..."
    npm install
    
    # Check .env exists
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            log_info "Creating .env from example..."
            cp .env.example .env
            log_warn "Please edit frontend/.env with your configuration before running the app."
        else
            log_error "No .env.example found in frontend/"
            exit 1
        fi
    fi
    
    # Build the frontend
    log_info "Building frontend..."
    npm run build
    
    cd ..
    log_info "Frontend setup complete."
}

# Main setup flow
main() {
    check_tools
    
    # Initialize git repo if needed
    if [ ! -d .git ]; then
        log_info "Initializing git repository..."
        git init
    fi
    
    # Setup backend and frontend
    setup_backend
    setup_frontend
    
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Edit backend/.env with your configuration"
    echo "  2. Edit frontend/.env with your configuration"
    echo "  3. Run: docker compose up --build  (for Docker deployment)"
    echo "     or: npx railway up  (for Railway deployment)"
    echo "  4. Visit http://localhost:5173 to start"
    echo ""
    echo "Demo credentials:"
    echo "  Student: aline@alustudent.com / demo1234"
    echo "  Admin:   admin@imari.rw / demo1234"
    echo "  Invite:  ALU-PILOT (valid through Feb 28, 2027)"
}

# Run main function
main "$@"