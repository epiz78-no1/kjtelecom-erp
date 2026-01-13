#!/bin/bash
git add .
git commit -m "fix: restore missing GET /api/material-usage endpoint (v1.2.24)"
git push origin dev

# Merge to main for production
git checkout main
git merge dev
git push origin main
git checkout dev
