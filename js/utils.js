// Utility functions
ZenPen = window.ZenPen || {};
ZenPen.util = (function () {

	function supportsHtmlStorage() {
		try {
			return 'localStorage' in window && window['localStorage'] !== null;
		} catch (e) {
			return false;
		}
	};

	function getText(el) {
		let ret = " ";
		const length = el.childNodes.length;
		for (let i = 0; i < length; i++) {
			const node = el.childNodes[i];
			if (node.nodeType != 8) {

				if (node.nodeType != 1) {
					// Strip white space.
					ret += node.nodeValue;
				} else {
					ret += getText(node);
				}
			}
		}
		return ZenPen.util.trim(ret);
	};

	function trim(string) {
		return string.replace(/^\s+|\s+$/g, '');
	};

	return {
		trim: trim,
		getText: getText,
		supportsHtmlStorage: supportsHtmlStorage
	}

})()