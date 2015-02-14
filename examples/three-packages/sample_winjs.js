WinJS.UI.processAll().done(function () {
	var menus = document.getElementsByClassName("myapp-menu");
	for(var i=0; i<menus.length; i++) {
	  menubutton = menus[i]
		menubutton.addEventListener("click", function () {
			var menu = document.getElementById(menubutton.id+"-.menu").winControl;
			menu.show(menubutton, "bottom");
		});
	}
});

