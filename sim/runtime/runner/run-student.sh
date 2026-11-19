#!/bin/sh
# Writes the student's file to tmpfs and runs it with the robot workspace sourced; the orchestrator validated SWAYFORM_ENTRY.
set -e
mkdir -p /tmp/run
printf '%s' "$SWAYFORM_CODE_B64" | base64 -d > "/tmp/run/$SWAYFORM_ENTRY"
unset SWAYFORM_CODE_B64
. /opt/ros/jazzy/setup.sh
. /opt/swayform_ws/install/setup.sh
cd /tmp/run
exec python3 -u "/tmp/run/$SWAYFORM_ENTRY"
