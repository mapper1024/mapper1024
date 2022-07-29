#!/usr/bin/env bash
set -e

VERSION="$1"

if [ -z "$VERSION" ]; then
	echo "Usage: $0 <version number>"
	echo "Current version is: $(jq < package.json .version -r)"
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

if [ -z "$FORCE_VERSION" ]; then
	if [[ "$(jq < package.json .version -r)" == "$VERSION" ]]; then
		echo "You have specified the current version."
		exit 1
	fi

	if git rev-parse v"$VERSION" > /dev/null 2>&1 || git ls-remote --exit-code --tags origin v"$VERSION" > /dev/null; then
		echo "That version already exists as a tag: v$VERSION"
		exit 1
	fi
fi

echo "Updating package.json"
TEMP_PACKAGE_JSON="$(mktemp)"
cat package.json > "$TEMP_PACKAGE_JSON"
python3 -c 'import json; import sys; p = json.loads(sys.stdin.read()); p["version"] = sys.argv[1]; print(json.dumps(p))' "$VERSION" < "$TEMP_PACKAGE_JSON" | jq --tab > package.json

echo "Updating mapper/version.js"
echo "// Do not edit; automatically generated by tools/update_version.sh" > mapper/version.js
echo -n "let version = " >> mapper/version.js
python3 -c 'import json; import sys; print(json.dumps(sys.argv[1]) + ";")' "$VERSION" >> mapper/version.js
echo "export { version };" >> mapper/version.js

echo "Updating DOWNLOAD.md"
echo "# Download Options" > DOWNLOAD.md
echo "Choose any option below to get the mapping tool." >> DOWNLOAD.md

echo "## Windows" >> DOWNLOAD.md
echo "* [Zip file](https://github.com/mapper1024/mapper1024/releases/download/v$VERSION/mapper1024-$VERSION.windows64.zip)" >> DOWNLOAD.md
echo "  * Extract the zip file and run the program file called \`mapper1024.exe\` found inside." >> DOWNLOAD.md
echo "* [Ordinary program](https://github.com/mapper1024/mapper1024/releases/download/v$VERSION/Mapper1024.$VERSION.exe)" >> DOWNLOAD.md
echo "  * This one doesn't need to be installed, just download it and run it. You may need to give it permission to run." >> DOWNLOAD.md
echo "* [Installer](https://github.com/mapper1024/mapper1024/releases/download/v$VERSION/Mapper1024.Setup.$VERSION.exe)" >> DOWNLOAD.md
echo "  * Run the installer and the mapping tool will be installed. You may need to give it permission to run." >> DOWNLOAD.md
echo "* [Zip file (32 bit)](https://github.com/mapper1024/mapper1024/releases/download/v$VERSION/mapper1024-$VERSION.windows32.zip)" >> DOWNLOAD.md
echo "  * Extract the zip file and run the program file called \`mapper1024.exe\` found inside." >> DOWNLOAD.md

echo "## Linux" >> DOWNLOAD.md
echo "* [AppImage](https://github.com/mapper1024/mapper1024/releases/download/v$VERSION/Mapper1024-$VERSION.AppImage)" >> DOWNLOAD.md
echo "  * See [How to run an AppImage](https://docs.appimage.org/introduction/quickstart.html#how-to-run-an-appimage) to use this option" >> DOWNLOAD.md
echo "* [Zip file](https://github.com/mapper1024/mapper1024/releases/download/v$VERSION/mapper1024-$VERSION.linux.zip)" >> DOWNLOAD.md
echo "  * Extract the zip file and run the program file called \`mapper1024\` found inside." >> DOWNLOAD.md

echo "## MacOS" >> DOWNLOAD.md
echo "Unfortunantely there are no desktop builds for MacOS. You can still explore the live demo linked below." >> DOWNLOAD.md

echo "## Live Demo" >> DOWNLOAD.md
echo "* Play with the live demo in your browser at [https://mapper1024.github.io/demo](https://mapper1024.github.io/demo)" >> DOWNLOAD.md

echo "## More information" >> DOWNLOAD.md
echo "The [current release](https://github.com/mapper1024/mapper1024/releases/latest) is built for all supported platforms. The mapper component javascript library is also bundled with each release." >> DOWNLOAD.md

echo "Version number updated. You may commit these changes and run tools/tag_from_version.sh"
