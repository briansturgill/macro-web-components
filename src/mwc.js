#!/usr/bin/env node

/* jshint node:true, evil:true */

"use strict";

var fs = require('fs');
var htmlparser = require('htmlparser2');
var commander = require('commander');

// Two ES6 shims
if (String.prototype.startsWith === undefined) {
	String.prototype.startsWith = function(str) {
		if (this.length < str.length) {
			return false;
		}
		if (this.substr(0, str.length) == str) {
			return true;
		}
		return false;
	};
}
if (String.prototype.endsWith === undefined) {
	String.prototype.endsWith = function(str) {
		if (this.length < str.length) {
			return false;
		}
		if (this.substr(-str.length) == str) {
			return true;
		}
		return false;
	};
}

commander
	.version('0.9.0')
	.usage('[options] input_file')
	.option('-c, --style_file [name]', 'Set CSS or other style (LESS, SASS, Stylus, etc.) output filename')
	.option('-h, --html_file [name]')
	.option('-j, --script_file [name]', 'Set JavaScript or other script (TypeScript, CoffeeScript, etc.) output file name.')
	.option('-p, --platform [name]')
	.option('-S, --suppress_comments')
	.parse(process.argv);

var suppressComments = false;
if (commander.suppress_comments !== undefined) {
	suppressComments = true;
}
var platformTag = "";
if (commander.platform !== undefined) {
	var platformTag = '_'+commander.platform;
}

if (commander.args.length != 1) {
	console.error(commander.help());
	process.exit(2);
}
var inputFile = commander.args[0];

if (!inputFile.endsWith(".mwch")) {
	console.error("Input file name must end with '.mwch'.");
	process.exit(3);
}

var fileStub = inputFile.replace(/\.mwch$/, '')+platformTag;

var htmlFile = fileStub+'.html';
if (commander.html_file !== undefined) {
	htmlFile = commander.html_file;
}
var styleFile = fileStub+'.css';
if (commander.style_file !== undefined) {
	styleFile = commander.style_file;
}
var scriptFile = fileStub+'.js';
if (commander.script_file !== undefined) {
	scriptFile = commander.script_file;
}

var singleton_tags = [
	"area",
	"base",
	"basefont",
	"br",
	"col",
	"frame",
	"hr",
	"img",
	"input",
	"isindex",
	"link",
	"meta",
	"param"
];

var root = { type:"root", value:"", children: [], parent:null };

function ParseHandler(root) {
	this.root = root;
	this.curPar = root;
}
ParseHandler.prototype.newNode = function(type, value, attrs) {
	var n = { type:type, value:value, attributes:attrs, children:[], parent:this.curPar};
	this.curPar.children.push(n);
	return n;
};
ParseHandler.prototype.onopentag = function(name, attributes) {
	this.curPar = this.newNode("tag", name, expandAttrMacros(attributes));
};
ParseHandler.prototype.ontext = function(text) {
	this.newNode("text", text);
};
ParseHandler.prototype.onclosetag = function(name) {
	if (this.curPar.value !== name) {
		console.error("Mismatched open and closing tags: "+this.curPar.value+", "+name);
		process.exit(4);
	}
	this.curPar = this.curPar.parent;
};
ParseHandler.prototype.oncomment = function(data) {
	this.curPar = this.newNode("comment", data);
};
ParseHandler.prototype.oncommentend = function() {
	this.curPar = this.curPar.parent;
};
ParseHandler.prototype.onprocessinginstruction = function(name, data) {
	this.newNode("process", data);
};
ParseHandler.prototype.onend = function() {
	if (this.curPar !== this.root) {
		console.error("Current parent is not equal to root");
		console.dir(this.curPar);
		process.exit(5);
	}
};
ParseHandler.prototype.onerror = function(error) {
	console.error(error);
	process.exit(6);
};

function expandAttrMacros(attrs) {
	var newAttrs = {};
	var attrKeys = Object.keys(attrs);
	var expansionNeeded = false;
	var i;
	for(i=0; i<attrKeys.length; i++) {
		if (attrKeys[i].startsWith('.')) {
			expansionNeeded = true;
			break;
		}
	}
	if (!expansionNeeded) {
		return attrs;
	}
	for(i=0; i<attrKeys.length; i++) {
		if (attrKeys[i] === 'class') {
			break;
		}
	}
	if (i === attrKeys.length) {
		newAttrs['class'] = '';
	}
	for(i=0; i<attrKeys.length; i++) {
		if (attrKeys[i].startsWith('.')) {
			var name = attrKeys[i].substr(1,attrKeys[i].length-1);
			if(newAttrs['class'] !== '') {
				newAttrs['class'] += ' ';
			}
			newAttrs['class'] += name;
		}
	}
	for(i=0; i<attrKeys.length; i++) {
		if (attrKeys[i].startsWith('.') || attrKeys[i] === 'class') {
			continue;
		}
		newAttrs[attrKeys[i]] = attrs[attrKeys[i]];
	}
	return newAttrs;
}

var scriptSeen = {};
var styleSeen = {};


function preprocess(html, attributes, cfname) {
	var lines = html.split('\n');
	var scriptStarted = false;
	var styleStarted = false;
	var transformStarted = false;
	var transform = "";
	var fd = 1;
	var suppressScript = false;
	if (scriptSeen[cfname] !== undefined) {
				suppressScript = true;
	}
	var suppressStyle = false;
	if (styleSeen[cfname] !== undefined) {
				suppressStyle = true;
	}

	function  misplacedTag(tag, idx) {
		idx += 1;
		console.error('Misplaced tag: "#'+tag+'" at line:'+idx+' in: '+cfname);
		process.exit(8);
	}

	function evalExpr(expr, attrs, cfna) {
		if (expr === undefined) {
			console.error('Missing expression at line:'+i+' in: '+cfname);
			process.exit(8);
		}
		var eparts = /\s*(\w+)\s*(===|!==|==|!=)\s*("[^"]*"|'[^']*')/.exec(expr);
		if (eparts !== null) {
			var str = eparts[3].substr(1, eparts[3].length-2); // Remove quotes
			if (eparts[2] === '===' || eparts[2] === '==') {
				return attrs[eparts[1]] === str;
			} else {
				return attrs[eparts[1]] !== str;
			}
		}
		eparts = /\s*defined\((\w+)\)/.exec(expr);
		if (eparts === null) {
			console.error('Invalid expression ('+expr+') at line:'+i+' in: '+cfname);
			process.exit(8);
		}
		return attrs[eparts[1]] !== undefined;
	}

	var ifBlockSatisfied = false;
	var ifStarted = false;
	var elseSeen = false;
	var suppressingLines = false;
	for (var i=0; i<lines.length; i++) {
		var tmp = /^#([a-z]+)(.*)/.exec(lines[i]);
		var tag;
		var expr;
		if (tmp === null) {
			if (suppressingLines) {
				lines[i] = '';
			}
			continue;
		} else {
			tag = tmp[1];
			expr = tmp[2];
		}
		if (tag === 'script' || tag === 'transform' || tag === 'style') {
			break;
		}
		if (tag === 'if') {
			if (ifStarted) {
				misplacedTag('if', i);
			}
			ifStarted = true;
			elseSeen = false;
			lines[i] = '';
			if (evalExpr(expr, attributes)) {
				ifBlockSatisfied = true;
				suppressingLines = false;
			} else {
				ifBlockSatisfied = false;
				suppressingLines = true;
			}
		} else if (tag === 'elif') {
			if (!ifStarted || elseSeen) {
				misplacedTag('elif', i);
			}
			if (!ifBlockSatisfied) {
				if (evalExpr(expr, attributes)) {
					ifBlockSatisfied = true;
					suppressingLines = false;
				} else {
					ifBlockSatisfied = false;
					suppressingLines = true;
				}
			} else {
				suppressingLines = true;
			}
			lines[i] = '';
		} else if (tag === 'else') {
			if (!ifStarted) {
				misplacedTag('else', i);
			}
			elseSeen = true;
			if (!ifBlockSatisfied) {
				ifBlockSatisfied = true;
				suppressingLines = false;
			} else {
				suppressingLines = true;
			}
			lines[i] = '';
		} else if (tag === 'endif') {
			if (!ifStarted) {
				misplacedTag('endif', i);
			}
			ifStarted = false;
			suppressingLines = false;
			lines[i] = '';
		} else if (tag === 'error') {
			console.error(cfname+'('+i+') ERROR: '+expr.trim());
			process.exit(8);
		} else {
			console.error('Unknown tag: "#'+tag+'" at line:'+i+' in: '+cfname);
			process.exit(8);
		}
	}

	if (ifStarted) {
		console.error('Missing #endif in: '+cfname);
		process.exit(8);
	}

	function copyPart(fd, lines, idx, suppress) {
		for (var i=idx; i<lines.length; i++) {
			if (lines[i].startsWith('##')) {
				lines[i] = lines[i.substr(1)];
			} else if (lines[i].startsWith('#')) {
				return i;
			}
			if (!suppress) {
				fs.writeSync(fd, lines[i]+'\n');
			}
			lines[i]='';
		}
		return i;
	}

	while (i < lines.length) {
		if (lines[i].startsWith('#script')) {
			scriptSeen[cfname] = true;
			if (!suppressScript) {
				fd = fs.openSync(scriptFile, "a");
				if (!suppressComments) {
					fs.writeSync(fd, '// Begin: '+cfname+'\n');
				}
			}
			lines[i] = "";
			i = copyPart(fd, lines, i+1, suppressScript);
			if (!suppressScript) {
				if (!suppressComments) {
					fs.writeSync(fd, '// End: '+cfname+'\n\n');
				}
				fs.closeSync(fd);
			}
		} else if (lines[i].startsWith('#style')) {
			styleSeen[cfname] = true;
			if (!suppressStyle) {
				fd = fs.openSync(styleFile, "a");
				if (!suppressComments) {
					fs.writeSync(fd, '/* Begin: '+cfname+' */\n');
				}
			}
			lines[i] = '';
			i = copyPart(fd, lines, i+1, suppressStyle);
			if (!suppressStyle) {
				if (!suppressComments) {
					fs.writeSync(fd, '/* End: '+cfname+' */\n\n');
				}
				fs.closeSync(fd);
			}
		} else if (lines[i].startsWith('#transform')) {
			if (transform !== '') {
				console.error('More than one transform not allowed in: '+cfname);
				process.exit(9);
			}
			transformStarted = true;
			lines[i++] = '';
			while (i < lines.length) {
				if (lines[i].startsWith('#')) {
					break;
				}
				transform += lines[i]+'\n';
				lines[i] = '';
				i++;
			}
		} else {
			console.error('Unexpected line: '+lines[i]+' in: '+cfname);
			process.exit(10);
		}
	}
	if (!suppressComments) {
		lines[0] = '<!-- Begin: '+cfname+' -->\n'+lines[0];
		lines.push('<!-- End: '+cfname+' -->');
	}
	for (i=0; i<lines.length; i++) {
		if (lines[i] !== '') {
			lines[i] = lines[i] +'\n';
		}
	}

	return { html:lines.join(''), transform:transform };
}

function makeAttrArgs(attrs) {
	return JSON.stringify(attrs)
	  .replace(/>/gm, '&gt;')
	  .replace(/</gm, '&lt;')
		.replace(/&/gm, '&amp;')
		.replace(/'/gm, '&apos;')
		.replace(/"/gm, '&quot;')
		;
}

var uniqueCounter = 1;
function expandMacros(html, attributes, cfname) {
	var uid = attributes.id;
	if (uid === undefined) {
		uid = 'uid-.'+uniqueCounter++;
	}
	attributes['uid@'] = uid;
	html = html.replace(/\${uid@}/gm, uid);

	html = html.replace(/\${attributes@}/gm, expandAttributes(attributes).trim());

	html = html.replace(/\${attributes-as-args@}/gm, 'data-mwc-aaa="'+
		makeAttrArgs(attributes)+'"');

	// ${attr}
	// Standard attribute substitution for the value of the attribute.
	// It is an error if attr is not present.


	Object.keys(attributes).forEach(function(attr) {
		var re = new RegExp('\\${'+attr+'}', 'gm');
		html = html.replace(re, attributes[attr]);
	});

	// ${attr=}
	// Pass the attribute to an internal component.
	// ${attr=} expands to attr="attr-value"
	// It is an error if attr is not present.

	Object.keys(attributes).forEach(function(attr) {
		var re = new RegExp('\\${'+attr+'=}', 'gm');
		html = html.replace(re, attr+'="'+attributes[attr]+'"');
	});

	// ${attr?}
	// Standard attribute substitution for the value of the attribute.
	// It is NOT an error if attr is not present.

	Object.keys(attributes).forEach(function(attr) {
		var re = new RegExp('\\${'+attr+'\?}', 'gm');
		html = html.replace(re, attributes[attr]);
	});
	html = html.replace(/\${[a-zA-Z-]+\?}/gm, '');

	// ${attr=?}
	// If attr exists, substitute attr="attr-value"
	// Otherwise replace with nothing.
	
	Object.keys(attributes).forEach(function(attr) {
		var re = new RegExp('\\${'+attr+'=\\?}', 'gm');
		html = html.replace(re, attr+'="'+attributes[attr]+'"');
	});
	html = html.replace(/\${[a-zA-Z-]+=\?}/gm, '');

	// Make ${attr?=} a synonym for ${attr=?}

	Object.keys(attributes).forEach(function(attr) {
		var re = new RegExp('\\${'+attr+'\\?=}', 'gm');
		html = html.replace(re, attr+'="'+attributes[attr]+'"');
	});
	html = html.replace(/\${[a-zA-Z-]+\?=}/gm, '');

	var l = html.match(/\${[a-zA-Z-]+=?}/);
	if (l !== null) {
		console.error("Unmatched attribute substitutions in component: ", cfname, l[0]);
	}

	// ${{ is an escape for ${

	html = html.replace(/\${{/gm, '${');
	return html;
}

function setChildContent(n, content) {
	n.children.forEach(function(c) {
		if (c.type == 'tag' && c.value == "content@") {
			content.parent = c.parent;
			c.type = 'root';
			c.value = '';
			c.children = content;
		}
		if (c.type === "tag" || c.type == "root") {
			if (c.children.length > 0) {
				setChildContent(c, content);
			}
		}
	});
}

function handleComponent(node) {
	var root = { type:"root", value:"", children: [], parent:null };
	var name = node.value.substr(0,node.value.length-1);
	var cfname = "mwc_components/"+name+".mwcc";
	if (!fs.existsSync(cfname)) {
		cfname = "mwc_components_common/"+name+".mwcc";
		if (!fs.existsSync(cfname)) {
			cfname = "mwc_components"+platformTag+"/"+name+".mwcc";
			if (!fs.existsSync(cfname)) {
				console.error('Cannot find component "'+name);
				process.exit(7);
			}
		}
	}

	var html = fs.readFileSync(cfname).toString();

	var ret = preprocess(html, node.attributes, cfname);
	html = ret.html;

	html = expandMacros(html, node.attributes, cfname);

	if (ret.transform !== '') {
		var tf = eval(ret.transform);
		html = tf(html, node.attributes);
	}
	var parser = new htmlparser.Parser(new ParseHandler(root), options);
	parser.parseChunk(html);
	parser.done();

	node.type = 'root';
	node.value = '';
	var content = node.children;
	node.children = root.children;
	node.children.forEach(function(c) {
		c.parent = node;
	});
	setChildContent(node, content);

	expandComponents(root);
}

var options = {
	lowerCaseTags: true,
	lowerCaseAttributeNames: true,
	recognizeSelfClosing: true,
};


function printIndent(fd, level) {
	var spaces = "                    ";
	while (spaces.length < level*2) {
		spaces += spaces;
	}
	fs.writeSync(fd, spaces.substr(0, level*2));
}

function expandAttributes(attrs) {
	var out = "";
	Object.keys(attrs).forEach(function(a) {
		out += ' '+a+'="'+attrs[a]+'"';
	});
	return out;
}

function printTree(fd, n, indentLevel) {
	switch(n.type) {
		case 'root':
			break;
		case 'text':
			var txt = n.value.trim();
			if (txt === "") {
				return;
			}
			printIndent(fd, indentLevel);
			fs.writeSync(fd, txt+'\n');
			return;
		case 'process':
			printIndent(fd, indentLevel);
			fs.writeSync(fd, '<'+n.value+'>\n');
			return;
		case 'comment':
			printIndent(fd, indentLevel);
			fs.writeSync(fd, '<!--'+n.value+'-->\n');
			return;
		case 'tag':
			printIndent(fd, indentLevel);
			fs.writeSync(fd, '<'+n.value+expandAttributes(n.attributes)+'>\n');
			indentLevel++;
			break;
	}
	n.children.forEach(function(c) {
		printTree(fd, c, indentLevel);
	});
	switch(n.type) {
		case 'tag':
			if (n.value === "head") {
				printIndent(fd, indentLevel);
				fs.writeSync(fd, '<link rel="stylesheet" type="text/css" href="'+styleFile+'">\n');
				printIndent(fd, indentLevel);
				fs.writeSync(fd, '<script type="text/javascript" src="'+scriptFile+'"></script>\n');
			}
			indentLevel--;
			if (singleton_tags.indexOf(n.value) === -1) {
				printIndent(fd, indentLevel);
				fs.writeSync(fd, '</'+n.value+'>\n');
			}
			break;
	}
}

function expandComponents(n) {
	if (n.type === 'root' || n.type ==='tag') {
		n.children.forEach(function(c) {
			expandComponents(c);
		});
	}
	if (n.type === 'tag' && n.value.endsWith('@')) {
		handleComponent(n);
	}
}

// Clear old files.
fs.closeSync(fs.openSync(styleFile, "w"));
fs.closeSync(fs.openSync(scriptFile, "w"));

var parser = new htmlparser.Parser(new ParseHandler(root), options);

var html = fs.readFileSync(inputFile).toString();

parser.parseChunk(html);
parser.done();

expandComponents(root);

var fd = fs.openSync(htmlFile, "w");

printTree(fd, root, 0);
fs.closeSync(fd);
