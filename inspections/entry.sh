#!/bin/bash
/opt/idea/bin/inspect.sh "$@" &

pid=$!

while kill -0 "$pid" 2> /dev/null; do
    echo -n '.'
    sleep 30
done

wait "$pid"