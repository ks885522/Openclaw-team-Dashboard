#!/bin/bash
#
# Agent Control CLI Tool
# 用於單獨停用/啟用 OpenClaw Agent
#
# 用法:
#   ./agent-ctl.sh <enable|disable|status> <agent-id|agent-name>
#
# 示例:
#   ./agent-ctl.sh status              # 顯示所有 agent 狀態
#   ./agent-ctl.sh status engineering  # 顯示 engineering agent 狀態
#   ./agent-ctl.sh disable engineering # 停用 engineering agent
#   ./agent-ctl.sh enable art-design   # 啟用 art-design agent

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 獲取 cron job JSON 數據 (包含停用的)
get_cron_json() {
    openclaw cron list --all --json 2>/dev/null
}

# 顯示帮助
show_help() {
    echo "Agent Control CLI Tool"
    echo ""
    echo "用法: $0 <command> [agent-id|agent-name]"
    echo ""
    echo "命令:"
    echo "  status [agent]   顯示所有 agent 狀態，或指定 agent 的狀態"
    echo "  enable <agent>  啟用指定的 agent"
    echo "  disable <agent> 停用指定的 agent"
    echo ""
    echo "可用 agents:"
    get_cron_json | jq -r '.jobs[].agentId' 2>/dev/null | sort | sed 's/^/  - /'
}

# 顯示狀態
cmd_status() {
    local target_agent="${1:-}"
    local json_output
    
    json_output=$(get_cron_json)
    
    if [[ -z "$json_output" ]] || ! echo "$json_output" | jq -e '.jobs' >/dev/null 2>&1; then
        echo -e "${RED}無法獲取 cron job 列表${NC}" >&2
        exit 1
    fi
    
    if [[ -z "$target_agent" ]]; then
        echo -e "${BLUE}=== Agent 狀態 ===${NC}"
        echo "$json_output" | jq -r '.jobs[] | "  \(if .enabled then "\u001b[0;32m" else "\u001b[0;31m" end)\(.agentId)\u001b[0m : \(.enabled)"'
    else
        local job_info
        job_info=$(echo "$json_output" | jq -r ".jobs[] | select(.agentId | contains(\"$target_agent\"))" 2>/dev/null || true)
        
        if [[ -z "$job_info" ]]; then
            echo -e "${RED}錯誤: 找不到 agent '$target_agent'${NC}" >&2
            exit 1
        fi
        
        local agent_id=$(echo "$job_info" | jq -r '.agentId')
        local cron_id=$(echo "$job_info" | jq -r '.id')
        local enabled=$(echo "$job_info" | jq -r '.enabled')
        
        echo -e "${BLUE}=== Agent: $agent_id ===${NC}"
        echo "  Cron Job ID: $cron_id"
        
        if [[ "$enabled" == "true" ]]; then
            echo -e "  狀態: ${GREEN}已啟用${NC}"
        else
            echo -e "  狀態: ${RED}已停用${NC}"
        fi
    fi
}

# 啟用 agent
cmd_enable() {
    local agent="${1:-}"
    local json_output
    
    if [[ -z "$agent" ]]; then
        echo -e "${RED}錯誤: 請指定要啟用的 agent${NC}" >&2
        show_help
        exit 1
    fi
    
    json_output=$(get_cron_json)
    
    # 查找對應的 cron job
    local cron_id=$(echo "$json_output" | jq -r ".jobs[] | select(.agentId | contains(\"$agent\")) | .id" 2>/dev/null | head -1)
    local agent_id=$(echo "$json_output" | jq -r ".jobs[] | select(.agentId | contains(\"$agent\")) | .agentId" 2>/dev/null | head -1)
    local enabled=$(echo "$json_output" | jq -r ".jobs[] | select(.agentId | contains(\"$agent\")) | .enabled" 2>/dev/null | head -1)
    
    if [[ -z "$cron_id" || "$cron_id" == "null" ]]; then
        echo -e "${RED}錯誤: 找不到 agent '$agent'${NC}" >&2
        exit 1
    fi
    
    if [[ "$enabled" == "true" ]]; then
        echo -e "${YELLOW}Agent '$agent_id' 已經是啟用狀態${NC}"
        exit 0
    fi
    
    echo -e "${BLUE}啟用 agent: $agent_id${NC}"
    openclaw cron enable "$cron_id"
    echo -e "${GREEN}✓ Agent '$agent_id' 已啟用${NC}"
}

# 停用 agent
cmd_disable() {
    local agent="${1:-}"
    local json_output
    
    if [[ -z "$agent" ]]; then
        echo -e "${RED}錯誤: 請指定要停用的 agent${NC}" >&2
        show_help
        exit 1
    fi
    
    json_output=$(get_cron_json)
    
    # 查找對應的 cron job
    local cron_id=$(echo "$json_output" | jq -r ".jobs[] | select(.agentId | contains(\"$agent\")) | .id" 2>/dev/null | head -1)
    local agent_id=$(echo "$json_output" | jq -r ".jobs[] | select(.agentId | contains(\"$agent\")) | .agentId" 2>/dev/null | head -1)
    local enabled=$(echo "$json_output" | jq -r ".jobs[] | select(.agentId | contains(\"$agent\")) | .enabled" 2>/dev/null | head -1)
    
    if [[ -z "$cron_id" || "$cron_id" == "null" ]]; then
        echo -e "${RED}錯誤: 找不到 agent '$agent'${NC}" >&2
        exit 1
    fi
    
    if [[ "$enabled" == "false" ]]; then
        echo -e "${YELLOW}Agent '$agent_id' 已經是停用狀態${NC}"
        exit 0
    fi
    
    echo -e "${BLUE}停用 agent: $agent_id${NC}"
    openclaw cron disable "$cron_id"
    echo -e "${GREEN}✓ Agent '$agent_id' 已停用${NC}"
}

# 主邏輯
main() {
    local command="${1:-}"
    local argument="${2:-}"
    
    case "$command" in
        status)
            cmd_status "$argument"
            ;;
        enable)
            cmd_enable "$argument"
            ;;
        disable)
            cmd_disable "$argument"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            if [[ -z "$command" ]]; then
                show_help
            else
                echo -e "${RED}錯誤: 未知命令 '$command'${NC}" >&2
                show_help
                exit 1
            fi
            ;;
    esac
}

main "$@"
