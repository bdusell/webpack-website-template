set -e
set -u
set -o pipefail

zipfile=${1-}
if ! shift 1; then
  echo "Usage: $0 <zip-file>

This script assumes that <zip-file> is a file downloaded from the IcoMoon App:
https://icomoon.io/app/

It assumes that the font has been named \"icons\".
" 2>&1
  exit 1
fi

tempdir=$(mktemp -d)
unzip -d "$tempdir" "$zipfile"
mkdir -p assets/fonts
cp "$tempdir"/fonts/icons.* assets/fonts
mkdir -p etc
cp "$tempdir"/selection.json etc
mkdir -p src/css
{
  echo "\$icomoon-font-path: '../../assets/fonts';"
  sed "
    s|@import \"variables\"|@import 'icon_variables'|;
    s|\\?[^'#]\\+||
  " "$tempdir"/style.scss
} > src/css/icons.scss
cp "$tempdir"/variables.scss src/css/icon_variables.scss
rm -r -- "$tempdir"
