// editor
ZenPen = window.ZenPen || {};
ZenPen.editor = (function () {

	// Editor elements
	let headerField, contentField, lastType, currentNodeList, lastSelection;

	// Editor Bubble elements
	let textOptions, optionsBox, boldButton, italicButton, quoteButton, urlButton, urlInput;

	let composing;
	let typewriterMode = false;
	let focusMode = false;

	function init() {

		composing = false;
		bindElements();

		createEventBindings();

		// Load state if storage is supported
		if (ZenPen.util.supportsHtmlStorage()) {
			loadState();
		} else {
			loadDefault();
		}
		// Set cursor position
		const range = document.createRange();
		const selection = window.getSelection();
		range.setStart(headerField, 1);
		selection.removeAllRanges();
		selection.addRange(range);

	}

	function createEventBindings() {

		// Key up bindings
		if (ZenPen.util.supportsHtmlStorage()) {

			document.onkeyup = function (event) {
				checkTextHighlighting(event);
				saveState();
			}

		} else {
			document.onkeyup = checkTextHighlighting;
		}

		// Mouse bindings
		document.onmousedown = checkTextHighlighting;
		document.onmouseup = function (event) {

			setTimeout(function () {
				checkTextHighlighting(event);
			}, 1);
		};

		// Window bindings
		window.addEventListener('resize', function (event) {
			updateBubblePosition();
		});


		document.body.addEventListener('scroll', function () {

			// TODO: Debounce update bubble position to stop excessive redraws
			updateBubblePosition();
		});

		// Composition bindings. We need them to distinguish
		// IME composition from text selection
		document.addEventListener('compositionstart', onCompositionStart);
		document.addEventListener('compositionend', onCompositionEnd);
	}


	function bindElements() {

		headerField = document.querySelector('.header');
		contentField = document.querySelector('.content');
		textOptions = document.querySelector('.text-options');

		optionsBox = textOptions.querySelector('.options');

		boldButton = textOptions.querySelector('.bold');
		boldButton.onclick = onBoldClick;

		italicButton = textOptions.querySelector('.italic');
		italicButton.onclick = onItalicClick;

		quoteButton = textOptions.querySelector('.quote');
		quoteButton.onclick = onQuoteClick;

		urlButton = textOptions.querySelector('.url');
		urlButton.onmousedown = onUrlClick;

		urlInput = textOptions.querySelector('.url-input');
		urlInput.onblur = onUrlInputBlur;
		urlInput.onkeydown = onUrlInputKeyDown;
	}

	function checkTextHighlighting(event) {

		const selection = window.getSelection();


		if ((event.target.className === "url-input" ||
			event.target.classList.contains("url") ||
			event.target.parentNode.classList.contains("ui-inputs"))) {

			currentNodeList = findNodes(selection.focusNode);
			updateBubbleStates();
			return;
		}

		// Check selections exist
		if (selection.isCollapsed === true && lastType === false) {

			onSelectorBlur();
		}

		// Text is selected
		if (selection.isCollapsed === false && composing === false) {

			currentNodeList = findNodes(selection.focusNode);

			// Find if highlighting is in the editable area
			if (hasNode(currentNodeList, "ARTICLE")) {
				updateBubbleStates();
				updateBubblePosition();

				// Show the ui bubble
				textOptions.className = "text-options active";
			}
		}

		lastType = selection.isCollapsed;

		if (typewriterMode && selection.isCollapsed) {
			centerCursor();
		}

		if (focusMode) {
			updateFocusMode();
		}
	}

	function toggleFocusMode() {
		focusMode = !focusMode;
		if (focusMode) {
			document.body.classList.add('focus-mode');
			updateFocusMode();
		} else {
			document.body.classList.remove('focus-mode');
			var active = document.querySelector('.active-block');
			if (active) active.classList.remove('active-block');
		}
	}

	function updateFocusMode() {
		if (!focusMode) return;

		const selection = window.getSelection();
		if (selection.rangeCount > 0 && selection.focusNode) {
			let node = selection.focusNode;
			// Find the direct child of article
			while (node && node.parentNode) {
				if (node.parentNode.tagName === 'ARTICLE' || node.parentNode.classList.contains('content')) {
					// This is the block
					const currentActive = document.querySelector('.active-block');
					if (currentActive && currentActive !== node) {
						currentActive.classList.remove('active-block');
					}
					if (node.nodeType === 1) { // Ensure it's an element
						node.classList.add('active-block');
					}
					break;
				}
				node = node.parentNode;
			}
		}
	}

	function toggleTypewriterMode() {
		typewriterMode = !typewriterMode;
		if (typewriterMode) {
			centerCursor();
		}
	}

	function centerCursor() {
		if (!typewriterMode) return;

		const selection = window.getSelection();
		if (selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			const rect = range.getBoundingClientRect();

			// Only scroll if the cursor is significantly away from center to avoid jitter
			const viewportCenter = window.innerHeight / 2;
			const diff = rect.top - viewportCenter;

			if (Math.abs(diff) > 20) {
				window.scrollBy({
					top: diff,
					behavior: 'smooth'
				});
			}
		}
	}

	function updateBubblePosition() {
		const selection = window.getSelection();
		const range = selection.getRangeAt(0);
		const boundary = range.getBoundingClientRect();

		textOptions.style.top = boundary.top - 5 + window.pageYOffset + "px";
		textOptions.style.left = (boundary.left + boundary.right) / 2 + "px";
	}

	function updateBubbleStates() {

		// It would be possible to use classList here, but I feel that the
		// browser support isn't quite there, and this functionality doesn't
		// warrent a shim.

		if (hasNode(currentNodeList, 'B')) {
			boldButton.className = "bold active"
		} else {
			boldButton.className = "bold"
		}

		if (hasNode(currentNodeList, 'I')) {
			italicButton.className = "italic active"
		} else {
			italicButton.className = "italic"
		}

		if (hasNode(currentNodeList, 'BLOCKQUOTE')) {
			quoteButton.className = "quote active"
		} else {
			quoteButton.className = "quote"
		}

		if (hasNode(currentNodeList, 'A')) {
			urlButton.className = "url useicons active"
		} else {
			urlButton.className = "url useicons"
		}
	}

	function onSelectorBlur() {

		textOptions.className = "text-options fade";
		setTimeout(function () {

			if (textOptions.className == "text-options fade") {

				textOptions.className = "text-options";
				textOptions.style.top = '-999px';
				textOptions.style.left = '-999px';
			}
		}, 260)
	}

	function findNodes(element) {

		const nodeNames = {};

		// Internal node?
		const selection = window.getSelection();

		// if( selection.containsNode( document.querySelector('b'), false ) ) {
		// 	nodeNames[ 'B' ] = true;
		// }

		while (element.parentNode) {

			nodeNames[element.nodeName] = true;
			element = element.parentNode;

			if (element.nodeName === 'A') {
				nodeNames.url = element.href;
			}
		}

		return nodeNames;
	}

	function hasNode(nodeList, name) {

		return !!nodeList[name];
	}

	let saveTimeout;

	function saveState(event) {

		localStorage['header'] = headerField.innerHTML;
		localStorage['content'] = contentField.innerHTML;

		// Debounce save indicator
		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(function () {
			const indicator = document.querySelector('.save-indicator');
			if (indicator) {
				indicator.classList.add('visible');
				setTimeout(function () {
					indicator.classList.remove('visible');
				}, 2000);
			}
		}, 1000);
	}

	function loadState() {

		if (localStorage['header']) {
			headerField.innerHTML = localStorage['header'];
		} else {
			headerField.innerHTML = defaultTitle; // in default.js
		}

		if (localStorage['content']) {
			contentField.innerHTML = localStorage['content'];
		} else {
			loadDefaultContent()
		}
	}

	function loadDefault() {
		headerField.innerHTML = defaultTitle; // in default.js
		loadDefaultContent();
	}

	function loadDefaultContent() {
		contentField.innerHTML = defaultContent; // in default.js
	}

	function onBoldClick() {
		document.execCommand('bold', false);
	}

	function onItalicClick() {
		document.execCommand('italic', false);
	}

	function onQuoteClick() {

		const nodeNames = findNodes(window.getSelection().focusNode);

		if (hasNode(nodeNames, 'BLOCKQUOTE')) {
			document.execCommand('formatBlock', false, 'p');
			document.execCommand('outdent');
		} else {
			document.execCommand('formatBlock', false, 'blockquote');
		}
	}

	function onUrlClick() {

		if (optionsBox.className == 'options') {

			optionsBox.className = 'options url-mode';

			// Set timeout here to debounce the focus action
			setTimeout(function () {

				const nodeNames = findNodes(window.getSelection().focusNode);

				if (hasNode(nodeNames, "A")) {
					urlInput.value = nodeNames.url;
				} else {
					// Symbolize text turning into a link, which is temporary, and will never be seen.
					document.execCommand('createLink', false, '/');
				}

				// Since typing in the input box kills the highlighted text we need
				// to save this selection, to add the url link if it is provided.
				lastSelection = window.getSelection().getRangeAt(0);
				lastType = false;

				urlInput.focus();

			}, 100);

		} else {

			optionsBox.className = 'options';
		}
	}

	function onUrlInputKeyDown(event) {

		if (event.keyCode === 13) {
			event.preventDefault();
			applyURL(urlInput.value);
			urlInput.blur();
		}
	}

	function onUrlInputBlur(event) {

		optionsBox.className = 'options';
		applyURL(urlInput.value);
		urlInput.value = '';

		currentNodeList = findNodes(window.getSelection().focusNode);
		updateBubbleStates();
	}

	function applyURL(url) {

		rehighlightLastSelection();

		// Unlink any current links
		document.execCommand('unlink', false);

		if (url !== "") {

			// Insert HTTP if it doesn't exist.
			if (!url.match("^(http|https)://")) {

				url = "http://" + url;
			}

			document.execCommand('createLink', false, url);
		}
	}

	function rehighlightLastSelection() {
		const selection = window.getSelection();
		if (selection.rangeCount > 0) {
			selection.removeAllRanges();
		}
		selection.addRange(lastSelection);
	}

	function getWordCount() {

		const text = ZenPen.util.getText(contentField);

		if (text === "") {
			return 0
		} else {
			return text.split(/\s+/).length;
		}
	}

	function onCompositionStart(event) {
		composing = true;
	}

	function onCompositionEnd(event) {
		composing = false;
	}

	return {
		init: init,
		saveState: saveState,
		getWordCount: getWordCount,
		toggleTypewriterMode: toggleTypewriterMode,
		toggleFocusMode: toggleFocusMode
	}

})();
