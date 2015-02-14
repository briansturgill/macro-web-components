# macro-web-components
Macro Web Components - HTML macros and code organization to give you web components for all browsers, now.

## Component File Contents
The file must start with an HTML Macro Definition.

Optionally you can have `#script`, `#style` and `#transform` sections.
Only one #transform is allowed per file.

Commands beginning with `#` must start in column 1 and cannot have whitespace after the `#`.

## HTML Macro Definition
An HTML macro can contain normal HTML, attribute expansions, conditionally emitted html, macro invocations,
and the `<content@>` macro which expands to the children present in the parent macro invocation.

### Attribute expansions:

### Conditionally Emitted HTML

Below, "expr" is one of:

```
	defined(_attr_name_)
	_attr_name_ === "value"
	_attr_name_ !== "value"
```

I am open to making slightly more complicated expressions available, if you can give me a good use case
where they are essential.


```
#if expr
	<!-- This HTML is emitted if _expr_ is true. -->
#elif expr
	<!-- This HTML is emitted if _expr_ is true and the prior _expr_s were false. -->
	<!-- You can have multiple #elif ->
#else
	<!-- This HTML is emitted if all previous  _expr_ were false. -->
#endif
```
At any point in the HTML section you can place the `#error` command:
```
#error Your error message goes here.
```
If emitted, the `#error` prints an error message and aborts further processing.

\#if and friends cannot be nested.

\## <!-- Escape for a # at the beginning of a line. -->

The nesting and expression limitations are my attempt to limit complexity. Macros can be
very hard to interpret correctly when they are complex. Most of the Obfuscated C programming
contest entries are based around complex macros.

### Order of Expansion Processing
* Attribute expansions
* Conditionally emmitted HTML
* Transformation function (if present) is called.
* `<content@>` is filled with the content of the children from the macro invocation.
* The resulting HTML is parsed and searched for addtional macro expansions.

### `#transform` Section

This section contains the defintion of one JavaScript function expression.

* It will be called with two arguments `(text, attributes)`.
	* Text
