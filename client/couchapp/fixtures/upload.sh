#!/bin/sh

for f in `ls -1 *.json`; do
    echo "Uploading file: $f"
    curl -H "content-type:application/json" -T $f -X PUT http://localhost:5984/backendproxy/
done
