#!/usr/bin/env bash
set -e

if [[ ! -f package.json ]]; then
	echo "package.json not found. You must run $0 in the project directory."
	exit 1
fi

VERSION="$(jq < package.json .version -r)"

if [[ "$(git rev-parse --abbrev-ref HEAD)" != "master" ]]; then
	echo "You must run $0 from the master branch."
	exit 1
fi

if [[ $(git status --porcelain) != "" ]]; then
	echo "You have uncommitted changes."
	exit 1
fi

if git rev-parse v"$VERSION" > /dev/null 2>&1 || git ls-remote --exit-code --tags origin v"$VERSION" > /dev/null; then
	echo "That version already exists as a tag: v$VERSION"
	exit 1
fi

if ! yarn run check-format; then
	echo "The check-format script failed."
	exit 1
fi

if ! yarn run test; then
	echo "The test script failed."
	exit 1
fi

if ! yarn run doc; then
	echo "The doc script failed."
	exit 1
fi

echo "Tagging..."
git tag v"$VERSION"
echo "Pushing branch..."
git push
echo "Pushing tag..."
git push origin v"$VERSION"
