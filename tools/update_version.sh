#!/usr/bin/env bash
set -e

VERSION="$1"

if [ -z "$VERSION" ]; then
	echo "Usage: $0 <version number>"
	exit 1
fi

if ! (echo "$VERSION" | grep '^[0-9]*\.[0-9]*\.[0-9]*$' > /dev/null); then
	echo "That version does not match the major.minor.patch format."
	exit 1
fi

if [[ ! -f package.json ]]; then
	echo "package.json not found. You must run $0 in the project directory."
	exit 1
fi

if [[ "$(git rev-parse --abbrev-ref HEAD)" != "master" ]]; then
	echo "You must run $0 from the master branch."
	exit 1
fi

if [[ "$(jq < package.json .version -r)" == "$VERSION" ]]; then
	echo "You have specified the current version."
	exit 1
fi

if git rev-parse v"$VERSION" > /dev/null 2>&1 || git ls-remote --exit-code --tags origin v"$VERSION" > /dev/null; then
	echo "That version already exists as a tag: v$VERSION"
	exit 1
fi

echo "Updating package.json"
TEMP_PACKAGE_JSON="$(mktemp)"
cat package.json > "$TEMP_PACKAGE_JSON"
python3 -c 'import json; import sys; p = json.loads(sys.stdin.read()); p["version"] = sys.argv[1]; print(json.dumps(p))' "$VERSION" < "$TEMP_PACKAGE_JSON" | jq --tab > package.json

echo "Updating mapper/version.js"
echo -n "let version = " > mapper/version.js
python3 -c 'import json; import sys; print(json.dumps(sys.argv[1]))' "$VERSION" >> mapper/version.js
echo "export { version }" >> mapper/version.js

echo "Version number updated. You may commit these changes and run tools/tag_from_version.sh"
