#!/bin/bash
# Atlas Agent Launch Script
# Usage: ./atlas.sh "task description"
# Example: ./atlas.sh "Scaffold the Next.js project and create the Prisma schema"

TASK="${1:-Check BUILD_STATUS.md and report current status to Max}"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "⚡ Max → Atlas"
echo "📋 Task: $TASK"
echo "📁 Working in: $PROJECT_DIR"
echo ""

cd "$PROJECT_DIR"

claude --permission-mode bypassPermissions --print "You are Atlas, Platform Engineer at ZING Website Design.

Before starting any work:
1. Read AGENTS.md - your operating instructions
2. Read IDENTITY.md - who you are
3. Read SOUL.md - why this work matters
4. Read SPEC.md - the full build spec and tech stack
5. Read BUILD_STATUS.md - current progress

Your task from Max (Chief of Staff):
$TASK

After completing the task:
1. Update BUILD_STATUS.md with what was done
2. Run: openclaw system event --text \"Atlas: [brief summary of what was completed]\" --mode now

Working directory: $PROJECT_DIR
Platform code goes in: $PROJECT_DIR/platform/"
