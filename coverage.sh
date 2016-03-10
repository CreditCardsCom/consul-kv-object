#!/bin/bash
set -e

echo "Generatng coverage report"
npm test

echo "Opening results"
xdg-open coverage/lcov-report/index.html
