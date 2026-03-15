#!/bin/bash
set -e

echo "Running CI Check..."
echo "1. Linting..."
npm run lint

echo "2. Building..."
npm run build

echo "3. Testing..."
npm test

echo "CI Check Passed!"
