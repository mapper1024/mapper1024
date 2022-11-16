#!/bin/bash

if [[ ! -f package.json ]]; then
	echo "package.json not found. You must run $0 in the project directory."
	exit 1
fi

DIR="mapper/images"

if [ ! -d "$DIR" ]; then
	echo "Could not find target directory."
	exit 1
fi

INDEX_FILE="$DIR"/index.js

echo "// Autogenerated" > "$INDEX_FILE"
echo "const images = {" >> "$INDEX_FILE"

while read f_path; do
	i_name="$(basename "$f_path" .png)"
	echo "	$i_name: {image: new Promise((resolve) => {const image = new Image(); image.src = \"data:image/png;base64,$(base64 -w 0 "$f_path")\"; resolve(image); })}," >> "$INDEX_FILE"
done < <(find images -name '*.png')

echo "};" >> "$INDEX_FILE"
echo "export { images };" >> "$INDEX_FILE"