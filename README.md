# Macro Web Components

HTML macros and code organization to give you web components for all browsers, now.

## Installation
```
npm install -g mwc
```
## Documentation

* [Reference Manual](https://github.com/briansturgill/macro-web-components/blob/master/Reference.md)
* [Overview  Blog Post](http://codersnext.com/introducing-macro-web-components)
* [Quick Reference (see below)](#quick-reference)

## MWC Usage
```
Usage: mwc [options] input_file

Options:

-h, --help                output usage information
-V, --version             output the version number
-c, --style_file [name]   Set CSS or other style (LESS, SASS, Stylus,
                              etc.) output filename
-h, --html_file [name]    
-j, --script_file [name]  Set JavaScript or other script (TypeScript,                  
                              CoffeeScript, etc.) output file name.
-p, --platform [name]
-S, --suppress_comments
```
## Quick Reference

### .mwch (MWC-Enhanced HTML File Format)

An MWC-enhanced HTML file has a `.mwch` extension and contains normal HTML and component macro invocations.

As a short-hand, you can list a class attribute for both macro invocations and normal HTML as follows: `<button .btn .btn-lg></button>` which expands to `<button class="btn btn-lg"></button>`.

To help prevent naming conflicts and other incompatitiblities, choose all tag and attribute names using only lower-case letters and the `-` , `.` and `_` (dash, period and underscore) characters. Always start the name with a lower-case letter. The `@` character is reserved to MWC's implementation.

### .mwcc  (MWC Component File Format)

The file must start with an HTML Macro Definition.

The file can then contain optional `#script`, `#style` and `#transform` sections. They can be in any order, but only one `#transform` is allowed per file.

An HTML macro can contain normal HTML, attribute expansions, conditionally emitted HTML, macro invocations, and the `<content@>` macro which expands to the children present in the parent macro invocation.

#### Attribute expansions:

##### **`${attr}`**
Expands to the attribute value. It is an error `attr` is not given in the macro invocation
##### **`${attr=}`**
Expands to `attr="value"`. It is an error if `attr` is not defined in the macro invocation|
##### **`${attr?}`**

Like `${attr}` above, but if `attr` is not defined in the macro invocation it expands to the empty string rather than giving an error.

##### **`${attr?=}, ${attr=?}`**

Like `${attr=}` above, but expands to the empty string if `attr` is not defined in the macro invocation.

##### **`${uid@}`**

If the `id` attribute was given in the macro invocation, then this expands exactly like `${id}`. Otherwise a generated unique value is given. If you need multiple unique ids in you component use qualifying text. For example: `<button id="${uid@}-button1" ...>`

##### **`${attributes@}`**

Expands to the text of all attributes just as they were defined on the macro invocation. This is convenient when all you want is a thin wrapper around an existing HTML element or macro.
##### **`${attributes-as-args@}`**

This one is useful when you make a true web component using MWC. It causes your attributes combined with `uid@=${uid@}` to be stringified as JSON and emmited as:
```
data-mwc-aaa="JSON object with attributes passed + "uid@":${uid@}"
```
When initializing your component class, you can look for the `data-mwc-aaa` attribute for further initialization information. `uid@` is particularly helpful when you need to hookup event listeners. See the `my-click` example in the distribution for details, including helper functions.

#### Conditionally Emitted HTML

Below, "expr" is one of:

```
	defined(_attr_name_)
	_attr_name_ == "value"
	_attr_name_ != "value"

#if expr
	<!-- This HTML is emitted if _expr_ is true. -->
#elif expr
	<!-- This HTML is emitted if _expr_ is true and the prior _expr_s
	     were false. You can have multiple #elif -->
#else
	<!-- This HTML is emitted if all previous _expr_s were false. -->
#endif
```
At any point in the HTML section you can place the `#error` command:
```
#error Your error message goes here.
```
If emitted, the `#error` prints an error message and aborts further processing.

`#if` and friends cannot be nested.

`## <!-- Escape for a # at the beginning of a line. -->`

 #### Example `#transform` Function

```
    (function(text, attributes) {
      return text.toLower();
    })
```
