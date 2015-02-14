// Begin: mwc_components/my-counter.mwcc

hlp.initComponentClass('my-counter', function(scope, attrs) { 
	var uid = attrs['uid@'];
	scope.counter = attrs.counter;
	if (scope.counter === undefined) { 
		scope.counter = 0;
	} else {
		scope.counter = parseInt(scope.counter, 10);
	}
	hlp.$(uid+'-.span').textContent = scope.counter.toString();
	scope.increment = function () {
		scope.counter++;
		hlp.$(uid+'-.span').classList.add('my-counter-highlight');
		hlp.$(uid+'-.span').textContent = scope.counter.toString();
	};
	hlp.$(uid+'-.button').addEventListener("click", function(e) {
		scope.increment();
	});
});


// End: mwc_components/my-counter.mwcc

