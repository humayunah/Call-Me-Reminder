.PHONY: setup setup-backend setup-frontend run run-backend run-frontend clean help

# Default target
help:
	@echo "Call Me Reminder - Available commands:"
	@echo ""
	@echo "  make setup          - Set up both backend and frontend"
	@echo "  make setup-backend  - Set up backend (create venv, install deps)"
	@echo "  make setup-frontend - Set up frontend (npm install)"
	@echo ""
	@echo "  make run            - Run both backend and frontend (in parallel)"
	@echo "  make run-backend    - Run backend server only"
	@echo "  make run-frontend   - Run frontend dev server only"
	@echo ""
	@echo "  make clean          - Remove generated files (venv, node_modules, db)"
	@echo ""
	@echo "First time setup:"
	@echo "  1. Copy backend/.env.example to backend/.env and add your Vapi keys"
	@echo "  2. Run 'make setup' to install dependencies"
	@echo "  3. Run 'make run' to start both servers"

# Setup targets
setup: setup-backend setup-frontend
	@echo ""
	@echo "Setup complete! Next steps:"
	@echo "  1. Copy backend/.env.example to backend/.env"
	@echo "  2. Add your VAPI_API_KEY and VAPI_PHONE_NUMBER_ID to backend/.env"
	@echo "  3. Run 'make run' to start the application"

setup-backend:
	@echo "Setting up backend..."
	cd backend && python -m venv venv
	cd backend && (venv/Scripts/pip install -r requirements.txt || venv/bin/pip install -r requirements.txt)
	@echo "Backend setup complete!"

setup-frontend:
	@echo "Setting up frontend..."
	cd frontend && npm install
	@echo "Frontend setup complete!"

# Run targets
run:
	@echo "Starting backend and frontend..."
	@echo "Backend will run on http://localhost:8000"
	@echo "Frontend will run on http://localhost:3000"
	@echo ""
	@$(MAKE) -j2 run-backend run-frontend

run-backend:
	cd backend && (venv/Scripts/python -m uvicorn main:app --reload --port 8000 || venv/bin/python -m uvicorn main:app --reload --port 8000)

run-frontend:
	cd frontend && npm run dev

# Clean target
clean:
	@echo "Cleaning up..."
	rm -rf backend/venv
	rm -rf backend/*.db
	rm -rf backend/__pycache__
	rm -rf frontend/node_modules
	rm -rf frontend/.next
	@echo "Clean complete!"
