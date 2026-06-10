#!/bin/bash

echo "Starting discord-ai bot..."

# Go to this script's directory
cd "$(dirname "$0")"

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# Install dependencies if missing
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start the bot
node index.js