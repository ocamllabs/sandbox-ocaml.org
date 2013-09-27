```tryocaml
(* Binary tree with leaves carrying an integer. *)
type tree = Leaf of int | Node of tree * tree

let rec exists_leaf test tree =
  match tree with
  | Leaf v -&gt; test v
  | Node (left, right) -&gt;
      exists_leaf test left
      || exists_leaf test right

let has_even_leaf tree =
  exists_leaf (fun n -&gt; n mod 2 = 0) tree
```