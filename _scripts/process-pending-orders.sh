#!/bin/bash
# Process pending orders — called by cron every 2 minutes
cd /Volumes/ks500/OpenStock || exit 1
export NODE_PATH=/Volumes/ks500/OpenStock/node_modules
exec node _scripts/process-pending-orders.js
