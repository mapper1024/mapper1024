#!/bin/bash
set -e

if [[ ! -f package.json ]]; then
	echo "package.json not found. You must run $0 in the project directory."
	exit 1
fi

VERSION="$(jq < package.json .version -r)"

mkdir -p dist/demo
rm -r dist/demo
mkdir -p dist/demo

yarn run libpack
cp dist/mapper1024.$(jq < package.json .version -r).js dist/demo/mapper.js
cp -r samples/ dist/demo/samples/
