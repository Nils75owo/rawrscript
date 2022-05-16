# TODO

## Fixes (important)
* FIX: Hotfix: pass down additional options for the resolveNode function
	which contains an `passDown` boolean which gets set to false when using
	a namespace access so it cant go down in the scope tree
```
num baa = 123;
namespace foo { }

foo::baa; // 123        <========
```

* add: a library system

* add: `break` and `continue` keywords
* add: `switch` and `case` keywords
