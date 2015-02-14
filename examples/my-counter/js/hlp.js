hlp = {
	initComponentClass: function(className, initFunc) {
		window.addEventListener('load', function() {
			var l = document.getElementsByClassName(className);
			for (var i=0; i<l.length; i++) {
				var attrsargs = l[i].attributes['data-mwc-aaa'].value;
				if (attrsargs === undefined) {
					console.error('Missing attributes-as-args@ for component of class: '+className);
					continue;
				}
				var attrs = JSON.parse(attrsargs);
				initFunc({}, attrs);
			}
		});
	},
	$: function(id) {
		return document.getElementById(id);
	}
};
