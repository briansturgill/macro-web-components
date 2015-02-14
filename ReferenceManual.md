# Macro Web Components
HTML macros and code organization to give you web components for all browsers, now.

This is the reference manual for Macro Web Components. If you want an overview, see [this blog post](http://codersnext.com/introducing-macro-web-components). If you unfamiliar with macro expansion or if you don't know why you might want to use it, you should start with that blog post.

Using HTMl Macro Web Components consists of two types of files: HTML and Component.

An MWC-enhanced HTML file has a `.mwch` extension and contains normal HTML and component macro invocations.

## example.mwch
```
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" type="text/css" href="example.css">
  <script type="text/javascript" src="example.js"></script>
</head>
<body>
  <blink@>Sigh, really, did you have to make this blink?</blink@>
</body>
</html>
```

In the example above, the tag `<blink@>` is an example of a macro invocation of a macro component. During macro expansion, the file `blink.mwcc` will be obtained from a `mwc_component` subdirectory and it's contents and various transformations are applied to produce standard HTML.

Running the command `mwc example.mwch` will generate three files: `example.mcwh`, `example.css`, and `example.js`. Each macro invocation will be expanded into HTML and the CSS and JavaScript used by each macro component will be copied into the appropriate file.

MWC components have a `.mwcc` extension and have a multi-section format.

The components are normally placed in the `mwc_components` directory, but see the `--platform` switch in the [MWC Usage](#mwc-usage) section below for situations when you want sets of macros with the same names . (For example, one set for Bootstrap and another for WinJS.)

## blink.mwcc

```
<span class="blink ${class?}"><content@></span>

#style
.blink {
        -webkit-animation: blink 1s linear infinite;
        animation: blink 1s linear infinite;
}
@-webkit-keyframes blink {
        0% { opacity: 1.0; }
        90% { opacity: 1.0; }
        90.0001% { opacity: 0.0; }
        100% { opacity: 0.0; }
}
@keyframes blink {
        0% { opacity: 1.0; }
        90% { opacity: 1.0; }
        90.0001% { opacity: 0.0; }
        100% { opacity: 0.0; }
}

#script
// Javascript not needed for this example
```
Now, any time you want to make something blink, you only have to invoke the macro and the rest is taken care of automatically.

The `<content@>` macro invocation above is special. It causes the child content of the invoking macro to be copied into the output.

### A Short-hand for `class` attributes.
As a short-hand, you can list a class attribute for both macro invocations and normal HTML as follows:
```
<button .btn .btn-lg></button>
```
This will expand to:
```
<button class="btn btn-lg"></button>
```
If the `class` attribute is explicitly listed, the ones with the `.` shorthand will be appended.

The short-hand also works inside MWC component files.

### Naming Conventions

To help prevent naming conflicts and other incompatitiblities, choose all tag and attribute names using only lower-case letters and the `-` , `.` and `_` (dash, period and underscore) characters. Always start the name with a lower-case letter. The `@` character is reserved to MWC's implementation.

## Format of MWC Component Files

The file must start with an HTML Macro Definition.

The file can then contain optional `#script`, `#style` and `#transform` sections. They can be in any order, but only one `#transform` is allowed per file.

Commands begin with `#`, must start in column 1, and cannot have whitespace after the `#`.

### HTML Macro Definition
An HTML macro can contain normal HTML, attribute expansions, conditionally emitted HTML, macro invocations, and the `<content@>` macro which expands to the children present in the parent macro invocation.

After all expansions and transformations, the result must be a valid HTML fragment.
(Something that would be valid inside a block element.)

#### Attribute expansions:

##### **`${attr}`**
Expands to the attribute value. It is an error `attr` is not given in the macro invocation
```
<my-large-button@ id="button-a">Push</my-large-button@>
```
Invoking this macro definition:
```
<button id="${id}" class="btn btn-lg"><content@></button>
```
Will expand to:
```
<button id="button-a" class="btn btn-lg">Push</button>
```

##### **`${attr=}`**

Expands to `attr="value"`. It is an error if `attr` is not defined in the macro invocation|

```
<my-large-button@ id="button-a">Push</my-large-button@>
```
Invoking this macro definition:
```
<button ${id=} class="btn btn-lg"><content@></button>
```
Will expand to:
```
<button id="button-a" class="btn btn-lg">Push</button>
```

##### **`${attr?}`**

Like `${attr}` above, but if `attr` is not defined in the macro invocation it expands to the empty string rather than giving an error.

##### **`${attr?=}, ${attr=?}`**

Like `${attr=}` above, but expands to the empty string if `attr` is not defined in the macro invocation.

##### **`${uid@}`**

If the `id` attribute was given in the macro invocation, then this expands exactly like `${id}`. Otherwise a generated unique value is given. If you need multiple unique ids in you component use qualifying text. For example: `<button id="${uid@}-button1" ...>`

##### **`${attributes@}`**

Expands to the text of all attributes just as they were defined on the macro invocation. This is convenient when all you want is a thin wrapper around an existing HTML element or macro.

```
<lg-button@ id="button-a">Push</lg-button@>
```
Invoking this macro definition:
```
<button ${attributes@} .btn .btn-lg><content@></button>
```
Will expand to:
```
<button id="button-a" class="btn btn-lg">Push</button>
```

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
```

I am open to making slightly more complicated expressions available, if you can give me a good use case in which they are essential.


```
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

The nesting and expression limitations are my attempt to limit complexity. Macros can be
very hard to interpret correctly when they are complex. Most of the Obfuscated C programming contest entries are based around complex macros.

#### Order of Expansion Processing
* Attribute expansions
* Conditionally emmitted HTML
* Transformation function (if present) is called
*  The resulting HTML is parsed.
* `<content@>` is replaced with the children from the macro invocation
* The parsed HTML is searched for additional macro invocations

### `#script` Section

The contents of this section are appended to the `script_file` along with begin and end comments saying what file it came from. This is done only the first time a component is invoked.

### `#style` Section

The contents of this section are appended to the `style_file` along with begin and end comments saying what file it came from. This is done only the first time a component is invoked.

### `#transform` Section

This section contains the defintion of one JavaScript function expression.

* It will be called with two arguments `(text, attributes)`.
  * The `text` argument contains the  thus far expanded text of the html macro.
  * The `attributes` argument is an `Object` containing the key value pairs of the names and values of the attributes specified in the invocation of the macro. Additionally it has a special attribute named `uid@` which contains either the `id` specified in the macro invocation or a generated unique id if `id` was not present.
* The function expression must be enclosed in parentheses.
* The function is invoked inside the`mwc` program, so be gentle with things like global variables.
* The function must return the transformed text of the HTML macro.
* Remember you have the full power of `node.js` to help you do what ever you want to change the text.
* There can only be one `#transform` section per component file.
 
 #### Example `#transform` Function

```
    (function(text, attributes) {
      return text.toLower();
    })
```

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
Normally, components are placed in a `mwc_components` folder where they could be considered to be specific to your app. They can also be place in `mwc_components_common` which could be where you place shared components. If the `--platform` options is given (say with 'bootstrap'), then you would place the Bootstrap specific ones in `mwc_components_bootstrap`. And then you could place equivalent components for `WinJS` in `mwc_components_winjs` and use the same per app components and common components with one `.mcwh` file to generate files for both platforms.

When `--platform bootstrap` is used on an input file named `index.mwch`, the default output file names will be: `index_bootstrap.html`, `index_bootstrap.css`, and `index_bootstrap.js`.
