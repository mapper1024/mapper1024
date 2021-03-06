#!/bin/bash

if [[ ! -f package.json ]]; then
	echo "package.json not found. You must run $0 in the project directory."
	exit 1
fi

VERSION="$(jq < package.json .version -r)"

echo "Updating DOWNLOAD.md"
echo "# Download Options" > DOWNLOAD.md
echo "Choose any option below to get the mapping tool." >> DOWNLOAD.md

echo "## Windows" >> DOWNLOAD.md
echo "Because this app is in early development, Windows will detect that it is from an unknown publisher. You may need to give it permission to run. If you do not want to do this, you can use the live demo right in your browser instead, linked below." >> DOWNLOAD.md
echo "* [Ordinary program](https://github.com/mapper1024/mapper1024/releases/download/v$VERSION/Mapper1024.$VERSION.exe)" >> DOWNLOAD.md
echo "  * This one doesn't need to be installed, just download it and run it. You may need to give it permission to run." >> DOWNLOAD.md
echo "* [Installer](https://github.com/mapper1024/mapper1024/releases/download/v$VERSION/Mapper1024.Setup.$VERSION.exe)" >> DOWNLOAD.md
echo "  * Run the installer and the mapping tool will be installed. You may need to give it permission to run." >> DOWNLOAD.md
echo "* [Zip file](https://github.com/mapper1024/mapper1024/releases/download/v$VERSION/mapper1024-$VERSION.windows64.zip)" >> DOWNLOAD.md
echo "  * Extract the zip file and run the program file called \`Mapper1024.exe\` found inside. You may need to give it permission to run." >> DOWNLOAD.md
echo "* [Zip file (32 bit)](https://github.com/mapper1024/mapper1024/releases/download/v$VERSION/mapper1024-$VERSION.windows32.zip)" >> DOWNLOAD.md
echo "  * Extract the zip file and run the program file called \`Mapper1024.exe\` found inside. You may need to give it permission to run." >> DOWNLOAD.md

echo "## Linux" >> DOWNLOAD.md
echo "* [AppImage](https://github.com/mapper1024/mapper1024/releases/download/v$VERSION/Mapper1024-$VERSION.AppImage)" >> DOWNLOAD.md
echo "  * See [How to run an AppImage](https://docs.appimage.org/introduction/quickstart.html#how-to-run-an-appimage) to use this option." >> DOWNLOAD.md
echo "* [Zip file](https://github.com/mapper1024/mapper1024/releases/download/v$VERSION/mapper1024-$VERSION.linux.zip)" >> DOWNLOAD.md
echo "  * Extract the zip file and run the program file called \`mapper1024\` found inside." >> DOWNLOAD.md

echo "## MacOS" >> DOWNLOAD.md
echo "Unfortunantely there are no desktop builds for MacOS yet. You can still explore the live demo linked below." >> DOWNLOAD.md

echo "## Live Demo" >> DOWNLOAD.md
echo "* Play with the live demo in your browser at [https://mapper1024.github.io/demo](https://mapper1024.github.io/demo)" >> DOWNLOAD.md

echo "## More information" >> DOWNLOAD.md
echo "The [current release](https://github.com/mapper1024/mapper1024/releases/latest) is built for all supported platforms. The mapper component javascript library is also bundled with each release." >> DOWNLOAD.md
