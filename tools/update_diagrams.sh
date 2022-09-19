#!/bin/bash
set -e

if [[ ! -f package.json ]]; then
	echo "package.json not found. You must run $0 in the project directory."
	exit 1
fi

plantuml diagrams -nbthread auto -v &

pushd diagrams

while read n; do
	drawio -x -o "$(basename "$n" .drawio)".png -f png -b 8 "$n" &
done < <(find -name '*.drawio')

popd

wait
