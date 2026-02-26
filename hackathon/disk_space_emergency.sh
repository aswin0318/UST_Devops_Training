#!/bin/bash

USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')

if [ "$USAGE" -ge 90 ]; then
    FILES=$(du -a / 2>/dev/null | sort -nr | head -5 | awk '{print $2}')
    zip /tmp/emergency.zip $FILES
    rm -f $FILES
fi