#!/bin/bash

# Agent Quick Start Script
# Usage: ./scripts/create-agent.sh <agent-name> <agent-role> [description]
# Example: ./scripts/create-agent.sh "調色盤" "UI/美術設計、前端視覺"

set -e

# Get current working directory (the repo directory)
REPO_DIR="$(pwd)"
SCRIPT_DIR="$REPO_DIR/scripts"

# Go up 3 levels from repo to get workspace: repo -> agent-type -> workspace
# repo (engineering/repo) -> engineering -> agents -> workspace
WORKSPACE_DIR="$(dirname "$(dirname "$(dirname "$REPO_DIR")")")"

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./scripts/create-agent.sh <agent-name> <agent-role> [description]"
    echo "Example: ./scripts/create-agent.sh '調色盤' 'UI/美術設計、前端視覺'"
    echo ""
    echo "Make sure to run this from the repo directory"
    exit 1
fi

AGENT_NAME="$1"
AGENT_ROLE="$2"
AGENT_DESC="$3"
AGENT_DIR="$WORKSPACE_DIR/agents/$AGENT_NAME"

# Emoji mapping based on role
case "$AGENT_NAME" in
    "task-tracking") EMOJI="📋" ;;
    "requirements") EMOJI="🔍" ;;
    "art-design") EMOJI="🎨" ;;
    "engineering") EMOJI="⚙️" ;;
    "art-review") EMOJI="🖼️" ;;
    "feature-review") EMOJI="🧪" ;;
    "devops") EMOJI="🚀" ;;
    *) EMOJI="🤖" ;;
esac

# Check if agent already exists
if [ -d "$AGENT_DIR" ]; then
    echo "❌ Agent '$AGENT_NAME' already exists at $AGENT_DIR"
    exit 1
fi

# Create agent directory
mkdir -p "$AGENT_DIR/memory"
mkdir -p "$AGENT_DIR/notes"
mkdir -p "$AGENT_DIR/repo"
mkdir -p "$AGENT_DIR/.openclaw"

# Copy boilerplate files
cp -r "$REPO_DIR/boilerplate/"* "$AGENT_DIR/"

# Update AGENTS.md
sed -i "s/\[你的角色名稱\]/$AGENT_NAME/g" "$AGENT_DIR/AGENTS.md"
sed -i "s/\[你的 Emoji\]/$EMOJI/g" "$AGENT_DIR/AGENTS.md"

# Update SOUL.md
sed -i "s/# SOUL.md - \[你的角色名稱\]/# SOUL.md - $AGENT_NAME $EMOJI/g" "$AGENT_DIR/SOUL.md"
sed -i "s/\[你的名稱\]/$AGENT_NAME/g" "$AGENT_DIR/SOUL.md"
sed -i "s/\[角色描述\]/$AGENT_ROLE/g" "$AGENT_DIR/SOUL.md"

# Update IDENTITY.md
sed -i "s/\[你的名稱\]/$AGENT_NAME/g" "$AGENT_DIR/IDENTITY.md"
sed -i "s/\[Agent名稱\]/$AGENT_NAME/g" "$AGENT_DIR/IDENTITY.md"
sed -i "s/\[Emoji\]/$EMOJI/g" "$AGENT_DIR/IDENTITY.md"
sed -i "s/\[角色描述\]/$AGENT_ROLE/g" "$AGENT_DIR/IDENTITY.md"

# Update USER.md
sed -i "s/士官長/士官長/g" "$AGENT_DIR/USER.md"

echo "✅ Agent '$AGENT_NAME' created at $AGENT_DIR"
echo ""
echo "Next steps:"
echo "1. Edit $AGENT_DIR/SOUL.md to customize the workflow"
echo "2. Edit $AGENT_DIR/IDENTITY.md for role-specific details"
echo "3. Edit $AGENT_DIR/TOOLS.md to configure available tools"
echo "4. Run: cd $AGENT_DIR/repo && git init (if needed)"
echo "5. Delete BOOTSTRAP.md after first run"
