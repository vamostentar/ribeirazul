#!/bin/sh

# List all environment variables
echo "=== Environment Variables ==="
printenv | sort

# Check if JWT_SECRET is set
echo "\n=== JWT_SECRET Check ==="
if [ -z "$JWT_SECRET" ]; then
  echo "JWT_SECRET is not set"
else
  echo "JWT_SECRET length: $(echo -n "$JWT_SECRET" | wc -c)"
  echo "JWT_SECRET value: ${JWT_SECRET:0:10}..."
fi

# Check .env file
echo "\n=== .env File Check ==="
if [ -f "/app/.env" ]; then
  echo "/app/.env exists"
  echo "Contents of /app/.env:"
  cat /app/.env
else
  echo "/app/.env does not exist"
fi

# Check working directory
echo "\n=== Working Directory ==="
pwd
ls -la

# Check if .env exists in parent directory
if [ -f "../.env" ]; then
  echo "\n=== .env in parent directory exists ==="
  echo "Contents of ../.env:"
  cat ../.env
else
  echo "\n=== No .env in parent directory ==="
fi

echo "\n=== Process Environment ==="
ps aux

# Sleep to keep container running for inspection
sleep 3600
