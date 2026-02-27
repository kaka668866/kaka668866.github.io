#!/bin/bash

# 检查是否输入了参数 (1, 2, 3, 或 4)
if [ -z "$1" ]; then
    echo "使用方法: ./update_config.sh [编号1-4]"
    exit 1
fi

ID=$1
URL1="https://www.gitlabip.xyz/Alvin9999/PAC/refs/heads/master/backup/img/1/2/ipp/quick/${ID}/config.yaml"
URL2="https://gitlab.com/free9999/ipupdate/-/raw/master/backup/img/1/2/ipp/quick/${ID}/config.yaml"

# 模拟原脚本中的 cd /d "%~dp0"
cd "$(dirname "$0")"

echo "正在尝试从节点 ${ID} 更新配置..."

# 第一次尝试下载
wget -t 2 --no-hsts --no-check-certificate "$URL1" -O config.yaml

# 如果失败，尝试备用链接
if [ ! -f "config.yaml" ]; then
    echo "主链接失败，正在尝试备用链接..."
    wget -t 2 --no-hsts --no-check-certificate "$URL2" -O config.yaml
fi

# 检查最终是否下载成功
if [ -f "config.yaml" ]; then
    echo "下载成功，正在应用配置..."
    
    # 对应原脚本的备份逻辑
    rm -f ../config.yaml_backup
    [ -f ../config.yaml ] && mv ../config.yaml ../config.yaml_backup
    
    # 移动新文件
    mv config.yaml ../config.yaml
    
    echo "已更新完成最新Quick配置！"
else
    echo "ip更新失败，请试试其它ip更新"
    exit 1
fi
