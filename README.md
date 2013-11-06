# This repo is now deprecated.

The contents were moved to  https://github.com/ocaml/ocaml.org/tree/redesign
and they will eventually be in https://github.com/ocaml/ocaml.org/tree/master

http://ocaml-redesign.github.io is not built from this repo anymore.

------------

sandbox for the next <http://ocaml.org> with the new (2013) design

- `md-pages` is the directory where "MPP" Markdown files are.
  - Those are meant to be preprocessed with MPP to produce "pure" Markdown files. 
- `html-pages` is a directory that is *generated*. You're not supposed to put anything important inside because it may get deleted at anytime. (And it's not on Git, of course.) However it's *the* directory that contains the final ocaml.org website.
- `gen.bash` is the script that accepts (as arguments) `.md` files or directories that are `md-pages` or inside of it.
- `Makefile` is used by `gen.bash` to actually generate each `.html` page inside `html-pages`.
- `main_tpl.mpp` is the main template for generating the `.html` pages.
- ***undocumented files are either waiting to be documented, or deleted.***

-------------------------------
"MPP Markdown" means "Markdown that needs to be processed with MPP
before being real Markdown".
