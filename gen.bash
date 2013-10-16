#!/bin/bash

if which mpp > /dev/null && which omd > /dev/null
then
    true
else
    echo "You don't have mpp and/or omd"
    exit 1
fi

if [[ "$#" == "0" ]]
then
    echo "Usage:"
    echo "$0 md-pages/your-page-to-convert-to-html.md md-pages/a-directory-with-md-files-to-convert"
    exit 1
fi

IFS=
find "$@" -type f -iname '*.md' |
while read i
do
    target="$(sed -e 's/\.md$/.html/' -e 's/^md-pages/html-pages/' <<< "$i")"
    mkdir -p "$(dirname $target)" && make "$target"
done

find "$@" -type f -iname '*.html' |
while read i
do
    target="$(sed -e 's/^md-pages/html-pages/' <<< "$i")"
    mkdir -p "$(dirname $target)"
    cp "$i" "$target"
done

find "$@" -type f -iname '*.html.mpp' |
while read i
do
    target="$(sed -e 's/\.html\.mpp$/.html/' -e 's/^md-pages/html-pages/' <<< "$i")"
    mkdir -p "$(dirname $target)"
    mpp -so '((!' -sc '!))' -son '{{!' -scn '!}}' -soc '' -scc '' -sec '' -its < "$i" > "$target"
done

(cd html-pages && find . -name '*.html' | sed -e 's|./|/|' |
while read i
do
    echo "<li><a href='$i'>$i</a></li>"
done > ../md-pages/list.md
cd ..
make html-pages/list.html
rm -f md-pages/list.md
)

rsync opamhtml/doc_loader.js html-pages/pkg/docs/opam_doc_loader.js

