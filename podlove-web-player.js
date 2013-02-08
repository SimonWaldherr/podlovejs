(function($) {
	'use strict';

	var startAtTime = false,
		stopAtTime = false,
		// Keep all Players on site
		players = [],
		// Timecode as described in http://podlove.org/deep-link/
		// and http://www.w3.org/TR/media-frags/#fragment-dimensions
		timecodeRegExp = /(\d\d:)?(\d\d):(\d\d)(\.\d\d\d)?([,-](\d\d:)?(\d\d):(\d\d)(\.\d\d\d)?)?/;

	/**
	 * return number as string lefthand filled with zeros
	 * @param number number
	 * @param width number
	 * @return string
	 **/
	function zeroFill(number, width) {
		width -= number.toString().length;
		return width > 0 ? new Array(width + 1).join('0') + number : number + '';
	}

	/**
	 * accepts array with start and end time in seconds
	 * returns timecode in deep-linking format
	 * @param times array
	 * @return string
	 **/
	function generateTimecode(times) {
		function generatePart(seconds) {
			var part, hours, milliseconds;
			// prevent negative values from player
			if (!seconds || seconds <= 0) {
				return '00:00';
			}

			// required (minutes : seconds)
			part = zeroFill(Math.floor(seconds / 60) % 60, 2) + ':' +
					zeroFill(Math.floor(seconds % 60) % 60, 2);

			hours = zeroFill(Math.floor(seconds / 60 / 60), 2);
			hours = hours === '00' ? '' : hours + ':';
			milliseconds = zeroFill(Math.floor(seconds % 1 * 1000), 3);
			milliseconds = milliseconds === '000' ? '' : '.' + milliseconds;

			return hours + part + milliseconds;
		}

		if (times[1] > 0 && times[1] < 9999999 && times[0] < times[1]) {
			return generatePart(times[0]) + ',' + generatePart(times[1]);
		}

		return generatePart(times[0]);
	}

	/**
	 * parses time code into seconds
	 * @param string timecode
	 * @return number
	 **/
	function parseTimecode(timecode) {
		var parts, startTime = 0, endTime = 0;

		if (timecode) {
			parts = timecode.match(timecodeRegExp);

			if (parts && parts.length === 10) {
				// hours
				startTime += parts[1] ? parseInt(parts[1], 10) * 60 * 60 : 0;
				// minutes
				startTime += parseInt(parts[2], 10) * 60;
				// seconds
				startTime += parseInt(parts[3], 10);
				// milliseconds
				startTime += parts[4] ? parseFloat(parts[4]) : 0;
				// no negative time
				startTime = Math.max(startTime, 0);

				// if there only a startTime but no endTime
				if (parts[5] === undefined) {
					return [startTime, false];
				}

				// hours
				endTime += parts[6] ? parseInt(parts[6], 10) * 60 * 60 : 0;
				// minutes
				endTime += parseInt(parts[7], 10) * 60;
				// seconds
				endTime += parseInt(parts[8], 10);
				// milliseconds
				endTime += parts[9] ? parseFloat(parts[9]) : 0;
				// no negative time
				endTime = Math.max(endTime, 0);

				return (endTime > startTime) ? [startTime, endTime] : [startTime, false];
			}
		}
		return false;
	}

	function turnHighlightOff () { 
		$('.highlight').removeClass('highlight');
	}

	function checkCurrentURL() {
		var deepLink;
		deepLink = parseTimecode(window.location.href);
		if (deepLink !== false) {
			startAtTime = deepLink[0];
			stopAtTime = deepLink[1];
		}
	}

	function setFragmentURL(fragment) {
		var url;
		window.location.hash = fragment;
	}

	// update the chapter list when the data is loaded
	function updateChapterMarks(player, marks) {
		var doLinkMarks = marks.closest('table').hasClass('linked');

		marks.each(function () {
			var deepLink,
				mark       = $(this),
				startTime  = mark.data('start'),
				endTime    = mark.data('end'),
				isEnabled  = mark.data('enabled'),
				// isBuffered = player.buffered.end(0) > startTime,
				isActive   = player.currentTime > startTime - 0.3 &&
						player.currentTime <= endTime;

			// prevent timing errors
			if (player.buffered.length > 0) {
			  var isBuffered = player.buffered.end(0) > startTime;
			}

			if (isActive) {
				mark
					.addClass('active')
					.siblings().removeClass('active');
			}
			if (!isEnabled && isBuffered) {
				deepLink = '#t=' + generateTimecode([startTime, endTime]);

				$(mark).data('enabled', true).addClass('loaded').find('a[rel=player]').removeClass('disabled');
				/*
				if (doLinkMarks && mark.find('a').length === 0) {
					mark.find('td.title')
						.wrapInner('<a href="' + deepLink + '" />');
				}
				*/
			}
		});
	}

	function checkTime(e) {
		if (players.length > 1) { return; }
		var player = e.data.player;
		if (startAtTime !== false && 
			//Kinda hackish: Make sure that the timejump is at least 1 second (fix for OGG/Firefox)
			(typeof player.lastCheck === "undefined" || 
			Math.abs(startAtTime - player.lastCheck) > 1)) {
			player.setCurrentTime(startAtTime);
			player.lastCheck = startAtTime;
			startAtTime = false;
		}
		if (stopAtTime !== false && player.currentTime >= stopAtTime) {
			player.pause();
			stopAtTime = false;
		}
	}

	function addressCurrentTime(e) {
		var fragment;
		/* Why did we need that? It prevented firefox from generating fragments after pause
		if (players.length === 1 &&
				stopAtTime === false &&
				startAtTime === false) {
		*/
		if (players.length === 1) {
			fragment = 't=' + generateTimecode([e.data.player.currentTime]);
			setFragmentURL(fragment);
		}
	}

	/* --------------------- Build actual player ---- */

	$.fn.podlovewebplayer = function(options) {
		var player = this[0];

		//handle default values for params
		var params = $.extend({}, {
			'chapterlinks': 'all',
			'width': '100%',
			'duration': false
		}, options);

		//fine tuning params
		params.width = params.width.replace('px','');
		if (player.tagName == "AUDIO" && typeof params.audioWidth !== 'undefined') {
			params.width = params.audioWidth;
		}
		if (player.tagName == "VIDEO" && typeof $(player).attr('width') !== 'undefined') {
			params.width = $(player).attr('width');
		}
		//duration can be given in seconds or in timecode format
		if (params.duration && params.duration != parseInt(params.duration)) {
			var secArray = parseTimecode(params.duration);
			params.duration = secArray[0];
		}

		// MEJS options defaults (taken from mediaelementjs.com, slightly adopted for podcasting needs)
		var mejsoptions = {
			defaultVideoWidth: 480,
			defaultVideoHeight: 270,
			videoWidth: -1,
			videoHeight: -1,
			audioWidth: -1,
			audioHeight: 30,
			startVolume: 0.8,
			loop: false,
			enableAutosize: true,
			features: ['playpause','current','progress','duration','tracks','volume','fullscreen'],
			alwaysShowControls: false,
			iPadUseNativeControls: false,
			iPhoneUseNativeControls: false, 
			AndroidUseNativeControls: false,
			alwaysShowHours: false,
			showTimecodeFrameCount: false,
			framesPerSecond: 25,
			enableKeyboard: true,
			pauseOtherPlayers: true,
			duration: 0
		}

		//transfer width/height to the correct mejs counterparts	

		if (player.tagName == "AUDIO") {
			mejsoptions.audioWidth = params.width;
		} else {
			if (typeof params.height !== 'undefined') {
				mejsoptions.videoWidth = params.width;
				mejsoptions.videoHeight = params.height;
			}
		}
		
		//turn ALL suitable pwp params to mejs options
		$.each(mejsoptions, function(key, value){
			if (typeof params[key] !== 'undefined') {
				mejsoptions[key] = params[key];
			}
		});

		//wrapper and init stuff
		$(player).wrap('<div class="podlovewebplayer_wrapper" style="width: '+params.width+'px"></div>');
		var deepLink, wrapper = $(player).parent();
		players.push(player);

		//add params from html fallback area
		$(this).find('[data-pwp]').each(function(){
			params[$(this).data('pwp')] = $(this).html();
			$(this).remove();
		});

		//build rich player with meta data
		if (player.tagName == "AUDIO" && (
				typeof params.title !== 'undefined' ||
				typeof params.subtitle !== 'undefined' ||
				typeof params.summary !== 'undefined' ||
				typeof params.poster !== 'undefined' ||
				typeof $(player).attr('poster') !== 'undefined'
				)) {

			//kill play/pause button from miniplayer
			$.each(mejsoptions.features, function(i){
				if (this == 'playpause') {
					mejsoptions.features.splice(i,1);		
				}
			});
			

			wrapper.prepend('<div class="podlovewebplayer_meta"><a class="bigplay" href="#">Play Episode</a></div>');
			if (typeof params.poster !== 'undefined') {
				wrapper.find('.podlovewebplayer_meta').append(
					'<div class="coverart"><img src="'+params.poster+'" alt=""></div>');
			}
			if (typeof $(player).attr('poster') !== 'undefined') {
				wrapper.find('.podlovewebplayer_meta').append(
					'<div class="coverart"><img src="'+$(player).attr('poster')+'" alt=""></div>');
			}
			if (typeof params.title !== 'undefined') {
				wrapper.find('.podlovewebplayer_meta').append(
					'<h3>'+params.title+'</h3>');
			}
			if (typeof params.subtitle !== 'undefined') {
				wrapper.find('.podlovewebplayer_meta').append(
					'<div class="subtitle">'+params.subtitle+'</div>');
			}
			if (typeof params.summary !== 'undefined') {
				wrapper.find('.podlovewebplayer_meta').append(
					'<a href="#" class="infowindow" title="more information on the episode">info</a>');
				wrapper.find('.podlovewebplayer_meta').after(
					'<div class="summary">'+params.summary+'</div>');
			}
		}

		//build chapter table
		if (typeof params.chapters !== 'undefined') {
			var class_names = 'podlovewebplayer_chapters';
			if (params.chapterlinks != 'false') {
				class_names += ' linked linked_'+params.chapterlinks;
			}
			var tablestring = '<div class="pwp_chapterbox showonplay active"><table rel="'+player.id+'" class="'+class_names+'">';
			tablestring += '<caption>Podcast Chapters</caption><thead><tr>';
			if (params.chapterlinks != 'false') {
				tablestring += '<th scope="col">Play</th>';
			}
			tablestring += '<th scope="col">Title</th><th scope="col">Duration</th></tr></thead>';
			tablestring += '<tbody></tbody></table></div>';
			wrapper.append(tablestring);
			var table = wrapper.find('table[rel='+player.id+']');

			//prepare row data
			var tempchapters = {};
			var i = 0;

			//first round: kill empty rows and build structured object
			$.each(params.chapters.split("\n"), function(){
				var line = $.trim(this);
				var tc = parseTimecode(line.substring(0,line.indexOf(' ')));
				var chaptitle = $.trim(line.substring(line.indexOf(' ')));
				if (line.length > 5) {
					tempchapters[i] = {start: tc[0], title: chaptitle };
					i++;
				}
			});

			//second round: build actual dom table
			$.each(tempchapters, function(i){

				var deeplink = document.location;

				var finalchapter = (typeof tempchapters[parseInt(i)+1] === 'undefined') ? true : false;
				if (!finalchapter) {
					this.end = 	tempchapters[parseInt(i)+1].start;
					this.duration = generateTimecode([Math.round(this.end-this.start)]);
				} else {
					if (params.duration == 0) {
						this.end = 9999999999;
						this.duration = '…';
					} else {
						this.end = params.duration;
						this.duration = generateTimecode([Math.round(params.duration-this.start)]);
					}
				}

				// deeplink, start and end
				var deeplink_chap = '#t=' + generateTimecode( [this.start, this.end] );
				var rowstring = '<tr data-start="'+this.start+'" data-end="'+this.end+'">';

				if (params.chapterlinks != 'false') {
					var linkclass = "";
					if (params.chapterlinks != 'all') { linkclass = ' class="disabled"'; }
					rowstring += '<td class="chapterplay">';
					rowstring += '<a rel="player" title="play chapter" ';
					rowstring += 'data-start="' + deeplink + '"' + linkclass + '><span>»</span></a>';
					rowstring += '</td>';
				}
				rowstring += '<td>'+this.title+'</td>';
				rowstring += '<td class="timecode">'+"\n";
				rowstring += '<a class="deeplink" href="' + deeplink_chap;
				rowstring += '" title="chapter deeplink">#</a> '+"\n";
				rowstring += '<code>' + this.duration + '</code>' + "\n";
				rowstring += '</td>'+"\n";
				rowstring += '</tr>';
				table.append(rowstring);	
			});
			wrapper.append('<div class="pwp_tableend"></div>');
		}
		

		// parse deeplink
		deepLink = parseTimecode(window.location.href);
		if (deepLink !== false && players.length === 1) {
			$(player).attr({preload: 'auto', autoplay: 'autoplay'});
			startAtTime = deepLink[0];
			stopAtTime = deepLink[1];
		}

		// init MEJS to player
		mejsoptions.success = function (player) {
			addBehavior(player);
			if (deepLink !== false && players.length === 1) {
				$('html, body').delay(150).animate({
					scrollTop: $('.podlovewebplayer_wrapper:first').offset().top - 25
				});
			}
		}
		$(player).mediaelementplayer(mejsoptions);
	};


	/**
	 * add chapter behavior and deeplinking: skip to referenced
	 * time position & write current time into address
	 * @param player object
	 */
	var addBehavior = function(player) {

		var jqPlayer = $(player),
			layoutedPlayer = jqPlayer,
			playerId = jqPlayer.attr('id'),
			list = $('table[rel=' + playerId + ']'),
			marks = list.find('tr'),
			canplay = false;
			
		if (players.length === 1) {
			// check if deeplink is set
			checkCurrentURL();
		}

		// get things straight for flash fallback
		if (player.pluginType == 'flash') {
			var layoutedPlayer = $("#mep_" + player.id.substring(9));
		}
		// get DOM object of meta info
		var metainfo = layoutedPlayer.closest('.podlovewebplayer_wrapper').find('.podlovewebplayer_meta');
		var summary = layoutedPlayer.closest('.podlovewebplayer_wrapper').find('.summary');
		
		summary.each(function() {
			$(this).data("height", $(this).height());
			$(this).height('0px');
		})
		
		if (metainfo.length === 1) {
			metainfo.find('a.infowindow').on('click', function(){
				$(this).closest('.podlovewebplayer_wrapper').find('.summary').toggleClass('active');
				if($(this).closest('.podlovewebplayer_wrapper').find('.summary').hasClass('active')) {
					$(this).closest('.podlovewebplayer_wrapper').find('.summary').height($(this).closest('.podlovewebplayer_wrapper').find('.summary').data("height")+'px');
				}
				else {
					$(this).closest('.podlovewebplayer_wrapper').find('.summary').height('0px');
				}
				return false;
			});
			metainfo.find('.bigplay').on('click', function(){
				if (player.paused) {
					player.play();
					$(this).addClass('playing');
				} else {
					player.pause();
					$(this).removeClass('playing');
				}
				return false;
			});
		}
		

		// chapters list
		list
			.show()
			.delegate('a[rel=player]', 'click', function (e) {
				if ($(this).closest('table').hasClass('linked_all') || $(this).closest('tr').hasClass('loaded')) {
					e.preventDefault();
					var mark = $(this).closest('tr'),
						startTime = mark.data('start'),
						endTime = mark.data('end');

					if (mark.hasClass('active') && player.paused == false) {
						mark.addClass('paused');
						player.pause();
					} else {
						mark.addClass('highlight');
						setTimeout(turnHighlightOff, 200);
						// If there is only one player also set deepLink
						if (players.length === 1) {
							// setFragmentURL('t=' + generateTimecode([startTime, endTime]));
							setFragmentURL('t=' + generateTimecode([startTime]));
						} else {
							if (canplay) {
								// Basic Chapter Mark function (without deeplinking)
								player.setCurrentTime(startTime);
							} else {
								jqPlayer.bind('canplay', function () {
									player.setCurrentTime(startTime);
								});
							}
						}

						// flash fallback needs additional pause
						if (player.pluginType == 'flash') {
							player.pause();
						}
						player.play();
					}
				}
				return false;
			});

		// wait for the player or you'll get DOM EXCEPTIONS
		jqPlayer.bind('canplay', function () {
			canplay = true;

			// add duration of final chapter
			if (player.duration) {
				marks.find('.timecode code').eq(-1).each(function(){
					var start = Math.floor($(this).closest('tr').data('start'));
					var end = Math.floor(player.duration);
					$(this).text(generateTimecode([end-start]));
				});
			}
			

			// add Deeplink Behavior if there is only one player on the site
			if (players.length === 1) {
				jqPlayer.bind('play timeupdate', {player: player}, checkTime)
					.bind('pause', {player: player}, addressCurrentTime);
				// disabled 'cause it overrides chapter clicks
				// bind seeked to addressCurrentTime

				checkCurrentURL();

				// handle browser history navigation
				$(window).bind('hashchange onpopstate', checkCurrentURL);

			}

			// always update Chaptermarks though
			jqPlayer.bind('timeupdate', function () {
				updateChapterMarks(player, marks);
			});

			// update play/pause status
			jqPlayer.bind('play, playing', function(){
				list.find('.paused').removeClass('paused');
				if (metainfo.length === 1) {
					metainfo.find('.bigplay').addClass('playing');
				}
			});
			jqPlayer.bind('pause', function(){
				if (metainfo.length === 1) {
					metainfo.find('.bigplay').removeClass('playing');
				}
			});

		});
	};
}(jQuery));