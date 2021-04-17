jQuery(document).ready(function($) {

	var config = mw.config.get(['wgNamespaceNumber', 'wgTitle', 'wgUserGroups', 'skin']);

	function removeBlanks(arr) {
		var ret = [];
		var i, len;
		for (i = 0, len = arr.length; i < len; i++) {
			var s = arr[i];
			s = s.trim();
			if (s) {
				ret.push(s);
			}
		}
		return ret;
	}

	function replacePrefix(s, oldPrefix, newPrefix) {
		if (s.indexOf(oldPrefix) === 0) {
			s = s.substr(oldPrefix.length);
		}
		return newPrefix + s;
	}

	function doMassMove() {
		document.getElementById("wpMassMoveSubmit").disabled = true;
		var articles = document.getElementById("wpMassMovePages").value.split("\n");
		articles = removeBlanks(articles);
		if (!articles.length) {
			return;
		}
		var
			api = new mw.Api(),
			wpMassMoveReason = document.getElementById("wpMassMoveReason").value,
			wpMassMovePrefix1 = document.getElementById("wpMassMovePrefix1").value,
			wpMassMovePrefix2 = document.getElementById("wpMassMovePrefix2").value,
			wpMassMoveWatch = document.getElementById("wpMassMoveWatch").value,
			wpMassMoveNoRedirect = document.getElementById("wpMassMoveNoRedirect").checked,
			wpMassMoveMoveTalk = document.getElementById("wpMassMoveMoveTalk").checked,
			moved = 0,
			failed = [],
			error = [],
			deferreds = [],
			onSuccess = function () {
				moved++;
				document.getElementById("wpMassMoveSubmit").value = "(" + moved + ")";
			};

		function makeMoveFunc(article) {
			return function () {
				return $.Deferred(function (deferred) {
					var options = {
						format: 'json',
						action: 'move',
						watchlist: wpMassMoveWatch,
						from: article,
						to: replacePrefix(article, wpMassMovePrefix1, wpMassMovePrefix2),
						reason: wpMassMoveReason
					};
					if (wpMassMoveNoRedirect) {
						options.noredirect = '';
					}
					if (wpMassMoveMoveTalk) {
						options.movetalk = '';
					}
					var promise = api.postWithToken('move', options);
					promise.done(onSuccess);
					promise.fail(function (code, obj) {
						failed.push(article);
						error.push(obj.error.info);
					});
					promise.always(function () {
						deferred.resolve();
					});
				});
			};
		}

		// Make a chain of deferred objects. We chain them rather than execute them in
		// parallel so that we don't make 1000 simultaneous move requests and bring the
		// site down. We use deferred objects rather than the promise objects returned
		// from the API request so that the chain continues even if some articles gave
		// errors.
		var deferred = makeMoveFunc(articles[0])();
		for (var i = 1, len = articles.length; i < len; i++) {
			deferred = deferred.then(makeMoveFunc(articles[i]));
		}

		// Show the output and do cleanup once all the requests are done.
		$.when(deferred).then(function () {
			document.getElementById("wpMassMoveSubmit").value = "Done (" + moved + ")";
			if (failed.length) {
				var $failedList = $('<ul>');
				for(var x = 0; x < failed.length; x++) {
					// Link the titles in the "failed" array
					var failedTitle = mw.Title.newFromText(failed[x]);
					var $failedItem = $('<li>');
					if (failedTitle) {
						$failedItem.append( $('<a>')
							.attr('href', failedTitle.getUrl())
							.text(failed[x])
						);
					} else {
						$failedItem.text(failed[x]);
					}
					$failedItem.append(document.createTextNode(': ' + error[x]));
					$failedList.append($failedItem);
				}
				$('#wpMassMoveFailedContainer')
					.append($('<br />'))
					.append($('<b>')
						.text('Failed moves:')
					)
					.append($failedList);
			}
		});
	}
 
	function massMoveForm() {
	    var bodyContent;
		switch (config.skin) {
			case 'modern':
				bodyContent = 'mw_contentholder';
				break;
			case 'cologneblue':
				bodyContent = 'article';
				break;
			case 'vector':
			case 'monobook':
			case 'vector':
			default:
				bodyContent = 'bodyContent';
				break;
		}
		document.getElementsByTagName("h1")[0].textContent = "Plastikspork's/JJPMaster's mass-move tool";
		document.title = "Mass move - Uncyclopedia, the content-free encyclopedia";
		document.getElementById(bodyContent).innerHTML = '<div id="siteSub">From Uncylopedia, the content-free encyclopedia</div>' +
			'<p><s>Stolen</s> Adapted from Plastikspork\'s mass move tool which was adapted from Animum\'s mass-delete tool and Timotheus Canens\'s mass-edit tool</p>' +
			'<br />' + 'This tool is restricted to editors in the <code>sysop</code> or <code>rollback</code> groups.' +
			'<br />' + 'Your user groups are: ' + mw.config.get('wgUserGroups') + '<br /><br />' +
			'<form id="wpMassMove" name="wpMassMove">' +
			'<b>If you abuse this tool, it\'s <i>your</i> fault, not mine.</b>' +
			'<div id="wpMassMoveFailedContainer"></div>' +
			'<br /><br />' +
				'Pages to move (one on each line, please):<br />' +
					'<textarea tabindex="1" accesskey="," name="wpMassMovePages" id="wpMassMovePages" rows="10" cols="80"></textarea>' +
				'<br /><br /><table style="background-color:transparent">' +
				'<tr><td>Prefix to remove from the old name (e.g., Template:):</td>' +
					'<td><input type="text" id="wpMassMovePrefix1" name="wpMassMovePrefix1" maxlength="255" /></td></tr>' +
				'<tr><td>Prefix to add to the new name (e.g., User:JJPMaster/):</td>' +
					'<td><input type="text" id="wpMassMovePrefix2" name="wpMassMovePrefix2" maxlength="255" /></td></tr>' +
				'<tr><td>Move talk:</td>' +
					'<td><input type="checkbox" id="wpMassMoveMoveTalk" name="wpMassMoveMoveTalk"/></td></tr>' +
				'<tr><td>No redirect:</td>' +
					'<td><input type="checkbox" id="wpMassMoveNoRedirect" name="wpMassMoveNoRedirect"/></td></tr>' +
				'<tr><td>Watch Pages:</td>' +
						'<td><select id="wpMassMoveWatch">' +
							'<option value="nochange">No change</option>' +
							'<option value="preferences">User preferences</option>' +
							'<option value="watch">Add to watch list</option>' +
							'<option value="unwatch">Remove from watch list</option>' +
						'</select></td></tr>' +
				'<tr><td>Edit summary:</td>' +
					'<td><input type="text" id="wpMassMoveReason" name="wpMassMoveReason" maxlength="255" /></td></tr>' +
					'<tr><td><input type="button" id="wpMassMoveSubmit" name="wpMassMoveSubmit" value="Move" /></td>' +
			'</form>';
		document.getElementById("wpMassMoveSubmit").addEventListener("click", function (e) {
			doMassMove();
		});
	}
	
	function massMoveError() {
		var bodyContent = (config.skin == "cologneblue" ? "article" : "bodyContent");
		document.getElementsByTagName("h1")[0].textContent = "Plastikspork/JJPMaster's mass-move tool";
		document.title = "Mass move - Uncyclopedia, the content-free encyclopedia";
		document.getElementById(bodyContent).innerHTML = '<div id="siteSub">From Wikipedia, the free encyclopedia</div>' +
			'<p>Adapted from Animum\'s mass-delete tool and Timotheus Canens\'s mass-edit tool</p>' +
			'<br /><br />' + 'This tool is restricted to editors in the <code>sysop</code> or <code>rollback</code> groups.' +
			'<br /><br />' + 'Your user groups are: ' + mw.config.get('wgUserGroups') +
			'<br /><br />' + 'For more information, please feel free to contact the script author!';
	}
	 
	if(mw.config.get('wgNamespaceNumber') === -1 
		&& (mw.config.get('wgPageName') === "Special:Massmove" || 
		mw.config.get('wgPageName') === "Special:MassMove" ||
		mw.config.get('wgPageName') === "Especial:Massmove" ||
		mw.config.get('wgPageName') === "Especial:MassMove")
	) {
		if (/sysop/.test(config.wgUserGroups) || /rollback/.test(config.wgUserGroups)) {
			$.when( $.ready, mw.loader.using(['mediawiki.util'])).done( massMoveForm );
		} else {
			$.when( $.ready, mw.loader.using(['mediawiki.util'])).done( massMoveError );
		}
	}
});
mw.util.addPortletLink("p-cactions", "/wiki/Special:Massmove", "Mass move", "p-massmove", "Mass move");
mw.loader.load("//en.wikipedia.org/w/index.php?title=User:Awesome_Aasim/redirectcreator.js&action=raw&ctype=text/javascript");
mw.util.addPortletLink( 'p-cactions', '/wiki/Special:BlankPage/RedirectCreator', 'Redirect creator', 'rdrc', 'Create a redirect');
