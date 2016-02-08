
(function(global) {

	/*
	 * POLYFILLS
	 */

	if (typeof Array.prototype.includes !== 'function') {

		Array.prototype.includes = function(searchElement /*, fromIndex*/ ) {

			'use strict';

			var O   = Object(this);
			var len = parseInt(O.length) || 0;
			if (len === 0) {
				return false;
			}


			var n = parseInt(arguments[1]) || 0;
			var k;
			if (n >= 0) {
				k = n;
			} else {
				k = len + n;
				if (k < 0) { k = 0; }
			}


			var currentElement;

			while (k < len) {

				currentElement = O[k];
				if (searchElement === currentElement || (searchElement !== searchElement && currentElement !== currentElement)) {
					return true;
				}

				k++;

			}


			return false;

		};

	}


	var _get = function(id) {
		return localStorage.getItem('github-' + id);
	};

	var _set = function(id, value) {
		localStorage.setItem('github-' + id, value);
	};


	var _initialize = function() {

		[ 'todo', 'in-progress', 'in-testing' ].forEach(function(label) {

			var xhr = new XMLHttpRequest();
			var url = 'https://api.github.com/repos/' + _ORGA + '/' + _REPO + '/labels';

			xhr.open('POST', url, true);
			xhr.setRequestHeader('Authorization', 'token ' + _get('token'));
			xhr.send(JSON.stringify({
				name:  label,
				color: 'f66d33'
			}));

		});

		_set('init', 'awesome!');

	};



	/*
	 * EVENTS
	 */

	var _on_drag = function(card, event) {

		var issue = card.getAttribute('data-issue');
		if (issue !== null) {
			event.dataTransfer.setData('issue', issue);
		}

	};

	var _on_drop = function(zone, event) {

		var issue = event.dataTransfer.getData('issue');
		var label = zone.getAttribute('data-label');

		if (issue !== null && label !== null) {

			var found = null;

			for (var id in _ISSUES) {

				_ISSUES[id].forEach(function(other) {

					if ('' + other.number === '' + issue) {
						found = other;
					}

				});

			}


			if (found !== null) {
				_api_issue(found, label);
			}


			setTimeout(function() {
				_render();
			}, 500);

		}

	};



	/*
	 * HELPERS
	 */

	var _BOARDS = {
		backlog:     null,
		todo:        null,
		in_progress: null,
		in_testing:  null,
		done:        null
	};

	var _ISSUES = {
		backlog:     [],
		todo:        [],
		in_progress: [],
		in_testing:  [],
		done:        []
	};


	var _ORGA = global.location.pathname.split('/')[1];
	var _REPO = global.location.pathname.split('/')[2];

	var _api_issues = function(state, callback, scope) {

		state    = typeof state === 'string'    ? state    : 'open';
		callback = callback instanceof Function ? callback : function() {};
		scope    = scope !== undefined          ? scope    : this;


		var xhr = new XMLHttpRequest();
		var url = 'https://api.github.com/repos/' + _ORGA + '/' + _REPO + '/issues?per_page=254&state=' + state;

		xhr.open('GET', url, true);

		xhr.onload = function() {

			var data = null;
			try {
				data = JSON.parse(xhr.responseText);
			} catch(e) {
				data = null;
			}


			if (data instanceof Array) {

				data = data.sort(function(a, b) {
					if (a.number < b.number) return  1;
					if (a.number > b.number) return -1;
					return 0;
				});

			}


			try {
				callback.call(scope, data);
			} catch(e) {
				console.error(e);
			} finally {
				xhr = null;
			}

		};

		xhr.onerror = xhr.ontimeout = function() {

			try {
				callback.call(scope, null);
			} catch(e) {
				console.error(e);
			} finally {
				xhr = null;
			}

		};

		xhr.send(null);

	};

	var _api_issue = function(issue, state) {

		var labels = issue.labels;


		if (state.match(/todo|in-progress|in-testing/g)) {

			labels = labels.filter(function(label) {
				return label.match(/todo|in-progress|in-testing/g) === null;
			});

			labels.push(state);

		} else if (state === 'backlog') {

			labels = labels.filter(function(label) {
				return label.match(/todo|in-progress|in-testing/g) === null;
			});

		} else if (state === 'done') {

			labels = labels.filter(function(label) {
				return label.match(/todo|in-progress|in-testing/g) === null;
			});

		}


		var xhr1 = new XMLHttpRequest();
		var url1 = 'https://api.github.com/repos/' + _ORGA + '/' + _REPO + '/issues/' + issue.number + '/labels';

		xhr1.open('PUT', url1, true);
		xhr1.setRequestHeader('Authorization', 'token ' + _get('token'));
		xhr1.send(JSON.stringify(labels));
		issue.labels = labels;


		if (state === 'done' && issue.state !== 'closed') {

			var xhr2 = new XMLHttpRequest();
			var url2 = 'https://api.github.com/repos/' + _ORGA + '/' + _REPO + '/issues/' + issue.number;

			xhr2.open('PATCH', url2, true);
			xhr2.setRequestHeader('Authorization', 'token ' + _get('token'));
			xhr2.send(JSON.stringify({ state: 'closed' }));

		} else if (issue.state !== 'open') {

			var xhr2 = new XMLHttpRequest();
			var url2 = 'https://api.github.com/repos/' + _ORGA + '/' + _REPO + '/issues/' + issue.number;

			xhr2.open('PATCH', url2, true);
			xhr2.setRequestHeader('Authorization', 'token ' + _get('token'));
			xhr2.send(JSON.stringify({ state: 'open' }));

		}



		for (var id in _ISSUES) {

			_ISSUES[id] = _ISSUES[id].filter(function(other) {
				return issue !== other;
			});

		}

		var board  = _BOARDS[state.replace('-', '_')] || _BOARDS['backlog'];
		var issues = _ISSUES[state.replace('-', '_')] || _ISSUES['backlog'];

		if (board !== null && issues !== null) {

			var card = _BOARD.querySelector('div.scrumboard-card[data-issue="' + issue.number + '"]');
			if (card !== null) {

				card.parentNode.removeChild(card);
				board.insertBefore(card, board.children[0]);

				issues.push(issue);

			}

		}

	};

	var _update = function() {

		_BOARDS.backlog     = document.querySelector('div.scrumboard-cardzone[data-label="backlog"]');
		_BOARDS.todo        = document.querySelector('div.scrumboard-cardzone[data-label="todo"]');
		_BOARDS.in_progress = document.querySelector('div.scrumboard-cardzone[data-label="in-progress"]');
		_BOARDS.in_testing  = document.querySelector('div.scrumboard-cardzone[data-label="in-testing"]');
		_BOARDS.done        = document.querySelector('div.scrumboard-cardzone[data-label="done"]');


		_api_issues('open', function(data) {

			if (data instanceof Array) {

				_ISSUES.backlog     = [];
				_ISSUES.todo        = [];
				_ISSUES.in_progress = [];
				_ISSUES.in_testing  = [];


				data.map(function(issue) {

					var assignee = null;
					var avatar   = null;

					if (issue.assignee instanceof Object) {
						assignee = issue.assignee.html_url   || null;
						avatar   = issue.assignee.avatar_url || null;
					}


					return {
						number:   issue.number,
						title:    issue.title,
						body:     issue.body || '',
						url:      issue.url,
						assignee: assignee,
						avatar:   avatar,
						labels:   issue.labels.map(function(label) {
							return label.name
						}),
						state:    issue.state
					};

				}).forEach(function(issue) {

					var labels = issue.labels;
					if (labels.includes('in-testing')) {
						_ISSUES.in_testing.push(issue);
					} else if (labels.includes('in-progress')) {
						_ISSUES.in_progress.push(issue);
					} else if (labels.includes('todo')) {
						_ISSUES.todo.push(issue);
					} else {
						_ISSUES.backlog.push(issue);
					}

				});

			}


			_render();

		}, this);

		_api_issues('closed', function(data) {

			if (data instanceof Array) {

				_ISSUES.done = data.map(function(issue) {

					var assignee = null;
					var avatar   = null;

					if (issue.assignee instanceof Object) {
						assignee = issue.assignee.html_url   || null;
						avatar   = issue.assignee.avatar_url || null;
					}


					return {
						number:   issue.number,
						title:    issue.title,
						body:     issue.body || '',
						url:      issue.url,
						avatar:   avatar,
						assignee: assignee,
						labels:   issue.labels.map(function(label) {
							return label.name
						}),
						state:    issue.state
					};

				});

			}


			_render();

		}, this);

	};

	var _render = function() {

		var board  = null;
		var issues = [];
		var html   = '';


		board  = _BOARDS.backlog || null;
		issues = _ISSUES.backlog;

		if (board !== null) {
			board.innerHTML = issues.map(_render_card).join('');
			board.parentNode.children[0].innerHTML = 'Backlog&nbsp;(' + issues.length + ')';
		}


		board  = _BOARDS.todo || null;
		issues = _ISSUES.todo;

		if (board !== null) {
			board.innerHTML = issues.map(_render_card).join('');
			board.parentNode.children[0].innerHTML = 'Todo&nbsp;(' + issues.length + ')';
		}


		board  = _BOARDS.in_progress || null;
		issues = _ISSUES.in_progress;

		if (board !== null) {
			board.innerHTML = issues.map(_render_card).join('');
			board.parentNode.children[0].innerHTML = 'In&nbsp;Progress&nbsp;(' + issues.length + ')';
		}


		board  = _BOARDS.in_testing || null;
		issues = _ISSUES.in_testing;

		if (board !== null) {
			board.innerHTML = issues.map(_render_card).join('');
			board.parentNode.children[0].innerHTML = 'In&nbsp;Testing&nbsp;(' + issues.length + ')';
		}


		board  = _BOARDS.done || null;
		issues = _ISSUES.done;

		if (board !== null) {
			board.innerHTML = issues.map(_render_card).join('');
			board.parentNode.children[0].innerHTML = 'Done&nbsp;(' + issues.length + ')';
		}


		setTimeout(function() {

			var cards = [].slice.call(_BOARD.querySelectorAll('div.scrumboard-card'));
			if (cards.length > 0) {

				cards.forEach(function(card) {

					var draggable = card.getAttribute('draggable');
					if (draggable === null) {

						card.setAttribute('draggable', 'true');
						card.ondragstart = function(event) {
							_on_drag(this, event);
						};

					}

				});

			}

		}, 0);

	};

	var _render_card = function(issue) {

		var assignee = issue.assignee || '#';
		var avatar   = issue.avatar   || 'https://avatars.githubusercontent.com/u/0?v=3';
		var url      = issue.url.substr(issue.url.indexOf('/repos/') + 6);
		var html     = '';


		html += '<div class="scrumboard-card" data-issue="' + issue.number + '">';
		html += '<h3>'
		html += '<a href="' + url + '" target="_blank">#' + issue.number + '</a>: ';
		html += issue.title;
		html += '</h3>';
		html += '<a class="scrumboard-card-avatar" href="' + assignee + '" target="_blank"><img src="' + avatar + '" width="16" height="16"></a>';
		html += '</div>';


		return html;

	};



	/*
	 * IMPLEMENTATION
	 */

	var _BOARD = document.createElement('div');
	var _HOWTO = document.createElement('div');


	var main   = document.querySelector('div.main-content div.repository-content');
	if (main !== null) {

		var tmp1 = '';
		var tmp2 = '';


		tmp1 += '<input type="text" placeholder="Paste Personal Access Token here.">';
		tmp1 += '<a href="https://github.com/settings/tokens/new" target="_blank">Generate Token</a>';


		tmp2 += '<div id="scrumboard-backlog">';
		tmp2 += '<h2>Backlog</h2>';
		tmp2 += '<div class="scrumboard-dropzone" data-label="backlog">Drop Card here</div>';
		tmp2 += '<div class="scrumboard-cardzone" data-label="backlog"></div>';
		tmp2 += '</div>';

		tmp2 += '<div id="scrumboard-todo">';
		tmp2 += '<h2>Todo</h2>';
		tmp2 += '<div class="scrumboard-dropzone" data-label="todo">Drop Card here</div>';
		tmp2 += '<div class="scrumboard-cardzone" data-label="todo"></div>';
		tmp2 += '</div>';

		tmp2 += '<div id="scrumboard-in-progress">';
		tmp2 += '<h2>In Progress</h2>';
		tmp2 += '<div class="scrumboard-dropzone" data-label="in-progress">Drop Card here</div>';
		tmp2 += '<div class="scrumboard-cardzone" data-label="in-progress"></div>';
		tmp2 += '</div>';

		tmp2 += '<div id="scrumboard-in-testing">';
		tmp2 += '<h2>In Testing</h2>';
		tmp2 += '<div class="scrumboard-dropzone" data-label="in-testing">Drop Card here</div>';
		tmp2 += '<div class="scrumboard-cardzone" data-label="in-testing"></div>';
		tmp2 += '</div>';

		tmp2 += '<div id="scrumboard-done">';
		tmp2 += '<h2>Done</h2>';
		tmp2 += '<div class="scrumboard-dropzone" data-label="done">Drop Card here</div>';
		tmp2 += '<div class="scrumboard-cardzone" data-label="done"></div>';
		tmp2 += '</div>';




		_HOWTO.setAttribute('id', 'howto');
		_BOARD.setAttribute('id', 'scrumboard');

		_HOWTO.innerHTML = tmp1;
		_BOARD.innerHTML = tmp2;

		main.innerHTML   = '';
		main.parentNode.insertBefore(_HOWTO, main);
		main.parentNode.insertBefore(_BOARD, main);



		setTimeout(function() {

			var input = _HOWTO.querySelector('input');
			if (input !== null) {

				input.value    = _get('token');
				input.onchange = function() {
					_set('token', this.value);
				};

			}

			var dropzones = [].slice.call(_BOARD.querySelectorAll('div.scrumboard-dropzone'));
			if (dropzones.length > 0) {

				dropzones.forEach(function(dropzone) {

					dropzone.ondragover = function(event) {
						event.preventDefault();
					};

					dropzone.ondrop = function(event) {
						_on_drop(this, event);
					};

				});

			}

		}, 0);


		setTimeout(function() {

			_update();

			var init = _get('init');
			if (init === null) {

				var token = _get('token');
				if (token !== null) {
					_initialize();
				}

			}

		}, 500);

	}

})(typeof window !== 'undefined' ? window : this);

