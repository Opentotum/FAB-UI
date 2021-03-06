function number_format(number, decimals, dec_point, thousands_sep) {

	number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
	var n = !isFinite(+number) ? 0 : +number, prec = !isFinite(+decimals) ? 0 : Math.abs(decimals), sep = ( typeof thousands_sep === 'undefined') ? ',' : thousands_sep, dec = ( typeof dec_point === 'undefined') ? '.' : dec_point, s = '', toFixedFix = function(n, prec) {
		var k = Math.pow(10, prec);
		return '' + Math.round(n * k) / k;
	};

	// Fix for IE parseFloat(0.55).toFixed(0) = 0;
	s = ( prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
	if (s[0].length > 3) {
		s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
	}
	if ((s[1] || '').length < prec) {
		s[1] = s[1] || '';
		s[1] += new Array(prec - s[1].length + 1).join('0');
	}
	return s.join(dec);
}

function precise_round(num, decimals) {
	return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * @param time
 * @returns {String}
 */
function _time_to_string(time) {

	var hours = parseInt(time / 3600) % 24;
	var minutes = parseInt(time / 60) % 60;
	var seconds = time % 60;

	var day = 86400;

	if (time < day) {
		return pad(precise_round(hours, 0)) + ":" + pad(precise_round(minutes, 0)) + ":" + pad(precise_round(seconds, 0));
	} else {
		return '1 day';
	}

}

/**
 *
 * @param val
 * @returns
 */
function pad(val) {
	return val > 9 ? val : "0" + val;
}

function freeze_menu(except, task_type) {
	task_path = (typeof task_type == 'undefined' ? '' : '/'+task_type);

	var except_item_menu = [
		'dashboard',
		'objectmanager',
		'make',
		'make/history',
		'make'+task_path,
		except
	];

	var a = $("nav li > a");
	
	a.each(function() {
		var controller = $(this).attr('data-controller');
		if(jQuery.inArray( controller, except_item_menu ) >= 0 ){
			if (controller == except){
				if($(this).find('span:last').hasClass( "freeze-menu" ) == false)
					$(this).append('<span class="badge bg-color-red pull-right inbox-badge freeze-menu animated fadeIn">!</span>');
			}
		} else {
			$(this).addClass('menu-disabled');
			$(this).removeAttr('href');
		}
	});
}

/**
 *
 */
function unfreeze_menu() {

	$("#left-panel a").each(function(index, element) {
		$(this).removeClass('menu-disabled');
		$(this).attr('href', $(this).attr('data-href'));
	});

	$(".freeze-menu").remove();

	freezed = false;

}

function bytesToSize(bytes) {
	var k = 1000;
	var sizes = ["B", "Kb", "Mb", "Gb", "Tb"];
	if (bytes === 0)
		return '0 Bytes';
	var i = parseInt(Math.floor(Math.log(bytes) / Math.log(k)), 10);
	return parseFloat((bytes / Math.pow(k, i))).toFixed(3) + ' ' + sizes[i];
}



//======================================================================================================
/*
 *  GLOBAL
 *
 */
var notifications_interval;
var safety_interval;
var tasks_interval;
var EMERGENCY = false;
var IDLETIME = 0;
var idleInterval;
var do_system_call = true;
var SOCKET;
var SOCKET_CONNECTED = false;
var interval_internet;
var jogFirstEntry = true;
var PAGE_ACTIVE = true;
var PAGE_TITLE = '';
var RESETTING_CONTROLLER = false;
var STOPPING_ALL = false;
var IS_MACRO_ON = false;
var IS_TASK_ON = false;
var jog_ticket_url = '';
var interval_temperature;
var TEMPS_TIMEOUT = 2500;

var FAB_LITE_LOWER = 1000;
var FAB_LITE_UPPER = 1999;

var BLOCK_TEMP_EXT_SLIDER = false;

/** CHECK PRINTE SAFETY AJAX MODE*/
function safety() {

	if (!PAGE_ACTIVE) {
		return false;
	}

	if (!do_system_call) {
		return false;
	}

	if (SOCKET_CONNECTED) {
		return false;
	}

	if (EMERGENCY == false) {
		$.get("/temp/fab_ui_safety.json?time=" + jQuery.now(), function(data) {
			if (data.type == 'emergency') {
				show_emergency(data.code);
			}
		});
	}
}

function secure(mode) {
		IS_MACRO_ON = true;
		$.ajax({
			type : "POST",
			url : "/fabui/application/modules/controller/ajax/secure.php",
			data : {
				mode : mode
			},
			dataType : 'json'
	}).done(function(response) {
		EMERGENCY = false;
		IS_MACRO_ON = false;
	});
}

function set_tasks(data) {

	IS_TASK_ON = false;

	number_tasks = data.number;
	var controller = '';

	$(".task-list").find('span').html('	Tasks (' + data.number + ') ');

	if (data.number > 0) {

		IS_TASK_ON = true;

		$.each(data.items, function() {
			var row = this;
			controller = row.controller;
			
			if (controller == 'make') {
 				controller += '/' + row.type;
			}
			
		});

	}

	if (data.number > 0) {
		freeze_menu(controller, data.items[0].type);
		freezed = true;
	} else {
		freezed = false;
		unfreeze_menu();
	}

}

function set_updates(number) {

	number_updates = number;
	$(".update-list").find('span').html('	Updates (' + number + ') ');
	if (number > 0) {
		$("#left-panel").find('nav').find('ul').find('li').each(function() {
			if ($(this).find('a').attr("data-controller") == 'updates') {
				$(this).find('a').append('<span class="badge bounceIn animated bg-color-red pull-right inbox-badge">' + number + '</span>');
			}
		});
	}
	
	if(number_updates > 0){
		//var html = '<div class="row"><div class="col-sm-12"><div class="alert alert-danger alert-block animated bounce"><button class="close" data-dismiss="alert">×</button><h4 class="alert-heading"> <i class="fa fa-refresh"></i> New important software updates are now available, <a style="text-decoration:underline; color:white;" href="/fabui/updates">update now!</a> </h4></div></div></div>';
		//if(MODULE != 'updates')	$("#content").prepend(html);
	}
	

}

function update_notifications() {

	var total = number_updates + number_tasks + number_notifications;

	if (total > 0) {
		$("#fabtotum-activity").find('.badge').addClass('bg-color-red bounceIn animated');
		document.title = PAGE_TITLE + ' (' + total + ')';
	} else {
		$("#fabtotum-activity").find('.badge').removeClass('bg-color-red bounceIn animated');
		document.title = PAGE_TITLE;
	}

	if (number_tasks == 0) {
		freezed = false;
		unfreeze_menu();
	}

	$("#fabtotum-activity").find('.badge').html(total);

}

function refresh_notifications() {

	if (!PAGE_ACTIVE) {
		return false;
	}

	if (!do_system_call) {
		return false;
	}

	$(".notification").each(function(index, element) {
		var obj = $(this);
		if (obj.hasClass('active')) {
			var url = obj.find('input[name="fabtotum-activity"]').attr("id");
			var container = $(".ajax-notifications");
			loadURL(url, container);
		}
	});
}

/** CHECK TASKS, MENU AJAX MODE */
function check_notifications() {

	if (!PAGE_ACTIVE) {
		return false;
	}

	if (!do_system_call) {
		return false;
	}

	if (SOCKET_CONNECTED) {
		return false;
	}

	if (IDLETIME < max_idle_time || max_idle_time == 0) {
		var timestamp = new Date().getTime();
		$.ajax({
			type : "POST",
			url : "/fabui/application/modules/controller/ajax/check_notifications.php?time=" + timestamp,
			dataType : 'json',
			cache : false
		}).done(function(data) {

			//set_updates(data.updates);
			set_tasks(data.tasks);
			update_notifications();

			if (data.internet == true) {
				$('.internet').show();
			} else {
				$('.internet').hide();
			}
		});

	} else {

		lockscreen();
	}
}

/** ON LOAD */

$(function() {

	PAGE_TITLE = document.title;

	if (fabui) {

		//check is websocket
		if ("WebSocket" in window) {

			var host = window.location.hostname;
			var port = 9001;

			SOCKET = new FabWebSocket(host, port);

			SOCKET.bind('message', function(payload) {

				try {
					var obj = jQuery.parseJSON(payload);

				} catch(e) {
					return;
				}

				switch(obj.type) {

				case 'emergency':
					if(parseInt(obj.code) == 102) {
						EMERGENCY = true;
						stopAll('Front panel has been opened.<br> Aborting all operations');
						return;
					}
					show_emergency(obj.code);
					break;
				case 'alert':
					show_alert(obj.code);
					//show_emergency(obj.code);
					break;
				case 'security':
					EMERGENCY = false;
					break;
				case 'internet':
					show_connecions(obj.data);
					break;
				case 'serial':
					analizeResponse(obj.data.response);
					write_to_console(obj.data.command + ": " + obj.data.response);
					/* */
					break;
				case 'temperature':
					if ( typeof update_temperature_info == 'function') {
						update_temperature_info(obj.data);
						/*$(".btn").removeClass('disabled');*/
					}
					break;
				case 'error':
					//console.log(obj.error);
					break;
				case 'macro':
					manage_macro(obj.data);
					break;

				case 'task':

					if (obj.data.type == 'notifications') {
						set_tasks(obj.data);
						update_notifications();

					} else {
						manage_task(obj.data);
					}

					break;
				case 'create':
					if ( typeof create_socket_response == 'function') {
						create_socket_response(obj.data);
					}
					break;

				case 'system':
					manage_system_monitor(obj.data);
					break;
				case 'post_processing':
					manage_post_processing(obj.data);
					break;

				}

			});

			//when connected to the socket
			SOCKET.bind('open', function() {

				SOCKET_CONNECTED = true;
				
				SOCKET.send('message', '{"name": "getTasks"}');
				/*SOCKET.send('message', '{"name": "getInternet"}');*/
				SOCKET.send('message', '{"name": "getUsb"}');
				
			});

			//when connection is closed
			SOCKET.bind('close', function() {
				SOCKET_CONNECTED = false;
				socket_fallback();
			});

			//when an error occurred
			SOCKET.bind('error', function() {
				socket_fallback();

			});

			/*interval_internet = setInterval(check_connected, 360000);*/
			SOCKET.connect();

		}
		
		//init UI
		initUI();
		// Handler for .ready() called.
		notifications_interval = setInterval(check_notifications, 10000);
		idleInterval = setInterval(timerIncrement, 1000);
		safety_interval = setInterval(safety, 3000);
		interval_temperature = setInterval(get_temperatures, TEMPS_TIMEOUT);
		
		/* START TIMER... */
		$("#refresh-notifications").on('click', refresh_notifications);
		check_for_updates();
		check_connected();
	}

});



/** MOUSE MOVE FOR LOCK SCREEN */
$(document).mousemove(function(e) {
	IDLETIME = 0;
});

/** IDLE TIMER */
function timerIncrement() {
	IDLETIME++;
	if( (max_idle_time) > 0 && (IDLETIME > max_idle_time)){
		lockscreen();
	}
}

function lockscreen(){
	$("#lock-screen-form").submit();
}

/** SHUTDOWN */
function shutdown() {
	IS_MACRO_ON = true;
	openWait('<i class="fa fa-circle-o-notch fa-spin"></i> Shutdown in progress', 'Please wait...', false);
	clearInterval(notifications_interval);
	clearInterval(safety_interval);
	clearInterval(idleInterval);
	
	$.get("/fabui/application/modules/controller/ajax/shutdown.php", function(){
		timeoutShutdown();
	}).fail(function() {
    	timeoutShutdown();
  	});;
}

function timeoutShutdown()
{
	setTimeout(function() {
		waitTitle('Now you can switch off the power');
		showShutdownImage();
		//closeWait();
		IS_MACRO_ON = false;
	}, 15000);
}

function showShutdownImage(){
	
	
	var ShutdownFancyBox = function() {
		return {
			initFancybox : function() {
				jQuery(".fancybox-shutdown").fancybox({
					groupAttr : 'data-rel',
					openEffect : 'elastic',
					modal: true,
					titleShow: true,
					titlePosition: 'over',
					helpers : {
						title : {
							type : 'float'
						}
					}
				});

				$(".fbox-modal").fancybox({
					maxWidth : 800,
					maxHeight : 600,
					fitToView : false,
					width : '70%',
					height : '70%',
					autoSize : false,
					closeClick : false,
					closeEffect : 'fade',
					openEffect : 'elastic'
				});
			}
		};
	
	}();
	
	ShutdownFancyBox.initFancybox();
	$(".fancybox-shutdown").trigger('click');
	
	
}


function timeoutRestart()
{
	waitContent("Restarting please wait...");
	setTimeout(function() {
		IS_MACRO_ON = false;
		document.location.href = '/fabui/login/out';
	}, 85000);
}

function restart() {
	clearInterval(notifications_interval);
	clearInterval(safety_interval);
	clearInterval(idleInterval);
	IS_MACRO_ON = true;
	openWait("<i class='fa fa-circle-o-notch fa-spin'></i> Restart in progress", 'Please wait...', false);

	$.ajax({
		url: '/fabui/application/modules/controller/ajax/restart.php',
	}).done(function(data) {
	}).fail(function(jqXHR, textStatus){
		//clear intervals
		IS_MACRO_ON = false;
		waitContent("you will be redirect to login page");
		redirectToUrlWhenisReady('/fabui/login');
	});
}

function redirectToUrlWhenisReady (url, timer)
{
	timer = timer | 1000;
	var checkInterval = setInterval(function(){
		$.get(url)
			.success(function(result) { clearInterval(checkInterval); document.location.href = url; })
			.error(function(jqXHR, textStatus, errorThrown) { });
	}, timer);
}

/** CHECK FOR AVAILABLE UPDATES */
function check_for_updates() {
	
	setTimeout(function() {
		
		$.get("/fabui/updates/check", function(data, status){
			if(data.updates.updated == false){
				set_updates(1);
				update_notifications();
			}
	});
		
		
	}, 3000);
}

/** SUGGESTION */
$("#send-suggestion").on('click', function() {

	if ($.trim($("#suggestion-text").val()) == '') {
		return false;
	}

	$(".modal-content").find(".btn").addClass('disabled');
	$("#send-suggestion").html('<i class="fa fa-envelope-o"></i> Sending..');

	$.ajax({
		type : "POST",
		url : "/fabui/controller/suggestion",
		dataType : 'json',
		data : {
			text : $("#suggestion-text").val(),
			title : $("#suggestion-title").val()
		}
	}).done(function(response) {

		$(".modal-content").find(".btn").removeClass('disabled');
		$("#send-suggestion").html('<i class="fa fa-envelope-o"></i> Send');

		if (response.result == 1) {
			$("#suggestion-text").val('');
			$("#suggestion-title").val('');
			$(".suggestion-modal").modal("hide");

			$.smallBox({
				title : "Thanks",
				content : "so much for taking the time to help improve FABUI .",
				color : "#659265",
				iconSmall : "fa fa-smile-o fa-2X",
				timeout : 7000
			});

		} else {

			$.smallBox({
				title : "Warning",
				content : "an error occurred, please try to send again",
				color : "#C46A69",
				iconSmall : "fa fa-warning shake animated",
				timeout : 7000
			});

		}

	});

});

/** REPORT BUG */
$("#send-bug").on('click', function() {

	if ($.trim($("#bug-text").val()) == '') {
		return false;
	}

	$(".modal-content").find(".btn").addClass('disabled');
	$("#send-bug").html('<i class="fa fa-envelope-o"></i> Sending..');

	$.ajax({
		type : "POST",
		url : "/fabui/controller/bug",
		dataType : 'json',
		data : {
			text : $("#bug-text").val(),
			title : $("#bug-title").val()
		}
	}).done(function(response) {

		$(".modal-content").find(".btn").removeClass('disabled');
		$("#send-bug").html('<i class="fa fa-envelope-o"></i> Send');

		if (response.result == 1) {
			$("#bug-text").val('');
			$("#bug-title").val('');
			$(".bug-modal").modal("hide");

			$.smallBox({
				title : "Thanks",
				content : "so much for taking the time to help improve FABUI .",
				color : "#659265",
				iconSmall : "fa fa-smile-o fa-2X",
				timeout : 7000
			});

		} else {

			$.smallBox({
				title : "Warning",
				content : "an error occurred, please try to send again",
				color : "#C46A69",
				iconSmall : "fa fa-warning shake animated",
				timeout : 7000
			});

		}

	});

});

function dont_ask_wizard() {

	$.ajax({
		type : "POST",
		url : "/fabui/controller/wizard",
		dataType : 'json',
		data : {
			set : 0
		}
	}).done(function(response) {

	});
}

function finalize_wizard(){
	
	
	$.ajax({
		type : "POST",
		url : "/fabui/application/modules/maintenance/ajax/finish_wizard.php",
		dataType : 'json'
	}).done(function(response) {

	});
	
	
}

/** GET TRACE */
function getTrace(url, type, contenitor) {

	$.ajax({
		type : type,
		url : url,
	}).done(function(data, statusText, xhr) {

		if (xhr.status == 200) {
			contenitor.html(data);
			contenitor.scrollTop(1E10);
		}

	});
}

////////////////////////
function show_emergency(code) {

	jogFirstEntry = true;

	if (EMERGENCY == true) {
		return;
	}
	EMERGENCY = true;
	
	var buttons ='[OK][IGNORE]';
	
	if(code == parseInt(103)){
		buttons = '[IGNORE] [INSTALL HEAD]';
	}

	$.SmartMessageBox({
		title : "<h4><span class='txt-color-orangeDark'><i class='fa fa-warning fa-2x'></i></span>&nbsp;&nbsp;" + decode_emergency_code(code) + "<br>&nbsp;Press OK to continue or Ignore to disable this warning</h4>",
		buttons : buttons
	}, function(ButtonPressed) {
		
		if (ButtonPressed === "OK") {
			secure(1);
		}
		if (ButtonPressed === "IGNORE") {
			
			if(buttons.indexOf("INSTALL HEAD") > -1){		
				secure(1);
			}else{
				secure(0);
			}
			
			
		}
		
		if (ButtonPressed === "INSTALL HEAD") {
			installHead();
		}
	});

}

function show_alert(code) {

	$.smallBox({
		title : "Message",
		content : decode_emergency_code(code),
		color : "#5384AF",
		timeout : 10000,
		icon : "fa fa-warning"
	});

	
}

function decode_emergency_code(code) {

	switch(parseInt(code)) {
	case 100:
		return 'General Safety Lockdown';
		break;
	case 101:
		return 'Printer stopped due to errors';
		break;
	case 102:
		return 'Front panel is open, cannot continue';
		break;
	case 103:
		return 'Head not properly aligned or absent';
		break;
	case 104:
		return 'Extruder Temperature critical, shutting down';
		break;
	case 105:
		return 'Bed Temperature critical, shutting down';
		break;
	case 106:
		return 'X max Endstop hit: Move the carriage to the center or check <span class="txt-color-orangeDark"><strong>Settings > Hardware > Custom Settings > Invert X Endstop Logic</strong></span>';
		break;
	case 107:
		return 'X min Endstop hit: Move the carriage to the center or check <span class="txt-color-orangeDark"><strong>Settings > Hardware > Custom Settings >Invert X Endstop Logic</strong></span>';
		break;
	case 108:
		return 'Y max Endstop hit: Move the carriage to the center and reset';
		break;
	case 109:
		return 'Y min Endstop hit: Move the carriage to the center and reset';
		break;
	case 110:
		return 'The FABtotum has been idling for more than 10 minutes. Temperatures and Motors have been turned off.';
		break;
	case 120:
		return 'Both Y Endstops hit at the same time';
		break;
	case 121:
		return 'Both Z Endstops hit at the same time';
		break;
	case 122:
		return 'Ambient temperature is less then 15°C. Cannot continue.';
		break;
	case 123:
		return 'Cannot extrude filament: the nozzle temperature is too low';
		break;
	case 124:
		return 'Cannot extrude so much filament!';
		break;
	default:
		return 'Unknown error Error code: ' + code;
		break;
	}

}

function show_connections(data) {
	
	if(data.internet){
		if($("#ribbon .internet").length == 0){
			var html = '<span class="ribbon-button-alignment animated fadeIn intenet"><span class="btn btn-ribbon"  rel="tooltip" data-placement="right" data-original-title="Internet available" data-html="true"><i class="fa fa-globe "></i></span></span>';
			$("#ribbon").prepend(html);
			$("#top-alert-messages .no-internet-detected").remove();
		}
	}else{
		$("#ribbon .internet").remove();
		if($("#top-alert-messages .no-internet-detected").length == 0){
			var html = '<span class="label label-warning animated fadeIn no-internet-detected"><i class="fa fa-warning"></i> No internet connectivity detected. For a better experience please  <a class="txt-color-white" style="text-decoration:underline;" href="/fabui/settings/network/wlan">connect</a></span>';
			$("#top-alert-messages").html(html);
		}
	}
	if(data.wifi){
		if($("#ribbon .wifi").length == 0){
			var html = '<span class="ribbon-button-alignment animated fadeIn wifi"><span class="btn btn-ribbon"  rel="tooltip" data-placement="right" data-original-title="Wifi connected" data-html="true"><i class="fa fa-wifi "></i></span></span>';
			$("#ribbon").prepend(html);
		}
	}else{
		$("#ribbon .wifi").remove();
	}
	$("[rel=tooltip], [data-rel=tooltip]").tooltip();
}

function check_connected() {
	
	//krios
	setTimeout(function(){ 
		$.get("/fabui/controller/connection", function(data){
			show_connections(data);
		});
	}, 3000);
	
}

function socket_fallback() {
	SOCKET_CONNECTED = false;
}

function write_to_console(text, type) {

	type = type || '';

	if (type == 'macro' || type == "task") {
		$('.console').html(text);
		waitContent(text);
	} else {
		$('.console').append(text);
	}

	$('.console').scrollTop(1E10);
	waitContent(text);
}

function manage_macro(obj) {

	if (obj.type == 'trace') {
		write_to_console(obj.content, 'macro');
	} else if (obj.type == 'response') {
		manage_macro_response(obj.content);
	} else if (obj.type == 'status') {

	}

}

function manage_task(obj) {

	if (obj.type == 'trace') {
		write_to_console(obj.content, 'task');
	} else if (obj.type == 'monitor') {
		manage_task_monitor(obj);
	}

}

function manage_task_monitor(obj) {

}

function manage_macro_response(response) {

}

function manage_system_monitor(obj) {

	switch(obj.type) {
	case 'usb':
		mange_usb_monitor(obj.status, obj.alert);
		break;
	case 'lock':
		manage_lock_file(obj.status, obj.alert);
		break;
	}
}

function manage_post_processing(obj) {

}

function mange_usb_monitor(status, alert) {

	var message = '<p><strong>';
	if (status) {
		message += 'Usb disk inserted';
		if($("#ribbon .usb-ribbon").length == 0){
			var html = '<span class="ribbon-button-alignment usb-ribbon" ><span class="btn btn-ribbon "  rel="tooltip" data-placement="right" data-original-title="USB disk inserted" data-html="true"><i class="fa fa-usb "></i></span></span>';
			$("#ribbon").prepend(html);
		}
	} else {
		message += 'Usb disk removed';
		$("#ribbon .usb-ribbon").remove();
	}
	message += '</strong></p>';

	if (alert) {
		$.smallBox({
			title : "System",
			content : message,
			color : "#296191",
			timeout : 3000,
			icon : "icon-fab-usb"
		});
	}
}


function manage_lock_file(status, alert){	
}

function reset_controller() {
	RESETTING_CONTROLLER = true;
	openWait("<i class=\"fa fa-circle-o-notch fa-spin\"></i> Resetting controller");
	$.get('/fabui/application/modules/controller/ajax/reset_controller.php', function(){
		closeWait();
		RESETTING_CONTROLLER = false;
	});
}
function stopAll(message) {
	message = message || 'Aborting all operations ';
	openWait(message, ' ', false);
	STOPPING_ALL = true;
	$.get('/fabui/application/modules/controller/ajax/stop_all.php', function(){
		waitContent("Refreshing page");
		setTimeout(function(){ 
			location.reload(); 
		}, 3000);
	});
}



/********************
 *
 *
 * CALL JOG FUNCTIONS
 *
 *******************/

function jog_call(func, value){
	
	if(SOCKET_CONNECTED){
		jog_make_call_ws(func, value);
	}else{
		//fallback for socket
		if (typeof make_jog_call == 'function') make_jog_call(func, value); //if iam on jog page
		else jog_make_call_ajax(func, value);
	}
	
	
}
function jog_make_call_ws(func, value) {

	var jsonData = {};
	
	jsonData['func'] = func;
	jsonData['value'] = value;
	jsonData['step'] = $("#step").length > 0 ? $("#step").val() : 10;
	jsonData['z_step'] = $("#z-step").length > 0 ?  $("#z-step").val() : 5;
	jsonData['feedrate'] = $("#feedrate").length > 0 ? $("#feedrate").val() : 1000;
	jsonData['extruderFeedrate'] = $("#extruder-feedrate").length > 0 ? $("#extruder-feedrate").val() : 300;
	
	var message = {};

	message['name'] = "serial";
	message['data'] = jsonData;

	SOCKET.send('message', JSON.stringify(message));

}

function jog_make_call_ajax(func, value, callback){
	
	callback = callback || '';
	
	var data = {}
	data['function'] = func;
	data['value'] = value;
	data['step'] = $("#step").length > 0 ? $("#step").val() : 10;
	data['z_step'] = $("#z-step").length > 0 ?  $("#z-step").val() : 5;
	data['feedrate'] = $("#feedrate").length > 0 ? $("#feedrate").val() : 1000;
	data['extruderFeedrate'] = $("#extruder-feedrate").length > 0 ? $("#extruder-feedrate").val() : 300;
	$.ajax({
		type: "POST",
		url: '/fabui/application/modules/jog/ajax/exec.php',
		data: data,
		dataType: 'json'
	}).done(function( data ) {
		
		if(callback != '') callback(data);
		
	});		
}


function get_temperatures() {

	if (!RESETTING_CONTROLLER && !STOPPING_ALL && !IS_MACRO_ON && !IS_TASK_ON && !PRINTER_BUSY) {
		if(SOCKET_CONNECTED) jog_call("get_temperature", "");
	}
}

/*****************************
 *
 * UPDATE TEMPERATURES
 *
 */
function update_temperature_info(data) {
	
	
	if (data.response.indexOf('ok T:') > -1) {

		var str_temp = data.response.replace('ok ', '');
		var temperature = str_temp.split(' ');

		var ext_temp = temperature[0].split(':')[1];
		var ext_target = temperature[1].split('/')[1];
		var bed_temp = temperature[2].split(':')[1];
		var bed_target = temperature[3].split('/')[1];
		var ext_pilot = str_temp.slice(str_temp.indexOf('@:')+2).split(" ")[0];

		/******* TOP BAR *********************/
		$("#top-bar-nozzle-actual").html(parseInt(ext_temp));
		$("#top-bar-nozzle-target").html(parseInt(ext_target));
		$("#top-bar-bed-actual").html(parseInt(bed_temp));
		$("#top-bar-bed-target").html(parseInt(bed_target));
		
		if($("#top-act-ext-temp").length > 0){
			var textt_slider = document.getElementById('top-ext-target-temp').noUiSlider;
			document.getElementById('top-act-ext-temp').noUiSlider.set([parseInt(ext_temp)]);
			if (!textt_slider._clicked)
				document.getElementById('top-ext-target-temp').noUiSlider.set([parseInt(ext_target)]);
		}
		
		if($("#top-act-bed-temp").length > 0){
			document.getElementById('top-act-bed-temp').noUiSlider.set([parseInt(bed_temp)]);
		}
		
		if($("#top-bed-target-temp").length > 0){
			var tbedt_slider = document.getElementById('top-bed-target-temp').noUiSlider;
			if (!tbedt_slider._clicked)
				document.getElementById('top-bed-target-temp').noUiSlider.set([parseInt(bed_target)]);
		}

		if ( typeof (Storage) !== "undefined") {
			localStorage.setItem("nozzle_temp", ext_temp);
			localStorage.setItem("nozzle_temp_target", ext_target);
			localStorage.setItem("bed_temp", bed_temp);
			localStorage.setItem("bed_temp_target", bed_target);
			localStorage.setItem("ext_pilot_value", ext_pilot);

		} else {

		}

		/*********** JOG ***************************/
		if (MODULE == "jog") {
			var bedt_slider = document.getElementById('bed-target-temp').noUiSlider;

			if ($("#act-ext-temp").length > 0) {
				var extt_slider = document.getElementById('ext-target-temp').noUiSlider;

				$("#ext-actual-degrees").html(parseInt(ext_temp) + '&deg;C');
				document.getElementById('act-ext-temp').noUiSlider.set([parseInt(ext_temp)]);
				
				if (!extt_slider._clicked) {
					extt_slider.set([parseInt(ext_target)]);
					$("#ext-degrees").html(parseInt(ext_target) + '&deg;C');
				}
			}

			if (typeof updateGraphs == "function")
				updateGraphs();

			if ($("#ext-pilot-value"))
				$("#ext-pilot-value").html('@'+parseInt(ext_pilot));

			$("#bed-actual-degrees").html(parseInt(bed_temp) + '&deg;C');
			document.getElementById('act-bed-temp').noUiSlider.set([parseInt(bed_temp)]);
			if (!bedt_slider._clicked) {
				bedt_slider.set([parseInt(bed_target)]);
				$("#bed-degrees").html(parseInt(bed_target) + '&deg;C');
			}

			if (showTemperatureConsole) {
				write_to_console('Temperatures (M105) [Ext: ' + parseInt(ext_temp) + ' / ' + parseInt(ext_target) + ' ---  Bed: ' + parseInt(bed_temp) + ' / ' + parseInt(bed_target) + ']\n');
				showTemperatureConsole = false;
			}
		}
	}

}

/***
 * FUNCTION TO AVOID PAGE CHANGE WHEN SOME MACROS ARE ON
 *
 */
function checkExit() {
	
	if(STOPPING_ALL == false && IS_MACRO_ON == true){
		return "You have attempted to leave this page. The Fabtotum Personal Fabricator is still working. Are you sure you want to reload this page?";
	}
}

function initUI(){
	
	analizeMenu();
	$(".directions").on("click", directions);
	$( ".axisz" ).on( "click", axisz );
	$(".zero_all").on("click", zero_all);
	
	if ( typeof (Storage) !== "undefined") {
		/******* TOP BAR *********************/
		$("#top-bar-nozzle-actual").html(parseInt(localStorage.getItem("nozzle_temp")));
		$("#top-bar-nozzle-target").html(parseInt(localStorage.getItem("nozzle_temp_target")));
		$("#top-bar-bed-actual").html(parseInt(localStorage.getItem("bed_temp")));
		$("#top-bar-bed-target").html(parseInt(localStorage.getItem("bed_temp_target")));
		
	}
	
	/**
	 * TOP BAR TEMPERATURES CONTROL 
	 */
	// INIT SLIDERS
	
	//bed target
    noUiSlider.create(document.getElementById('top-bed-target-temp'), {
		start: typeof (Storage) !== "undefined" ? localStorage.getItem("bed_temp_target") : 0,
		connect: "lower",
		range: {'min': 0, 'max' : 100},
		pips: {
			
			mode: 'positions',
			values: [0,25,50,75,100],
			density: 5,
			format: wNumb({
				postfix: '&deg;'
			})
		}
	});
	//bet actual
	noUiSlider.create(document.getElementById('top-act-bed-temp'), {
		start: typeof (Storage) !== "undefined" ? localStorage.getItem("bed_temp") : 0,
		connect: "lower",
		range: {'min': 0, 'max' : 100},
		behaviour: 'none'
	});
	$("#top-act-bed-temp .noUi-handle").remove();
	// ===============================================================================
	//nozzle target (if is needed)
	if($("#top-ext-target-temp").length > 0){
		noUiSlider.create(document.getElementById('top-ext-target-temp'), {
			start: typeof (Storage) !== "undefined" ? localStorage.getItem("nozzle_temp_target") : 0,
			connect: "lower",
			range: {'min': 0, 'max' : MAX_NOZZLE_TEMP},
			pips: {
				mode: 'positions',
				values: [0,25,50,75,100],
				density: 5,
				format: wNumb({
					postfix: '&deg;'
				})
			}
		});
		//nozzle actual
		noUiSlider.create(document.getElementById('top-act-ext-temp'), {
			start: typeof (Storage) !== "undefined" ? localStorage.getItem("nozzle_temp") : 0,
			connect: "lower",
			range: {'min': 0, 'max' : MAX_NOZZLE_TEMP},
			behaviour: 'none'
		});
		//SLIDER EVENTS - EXTRUDER
		document.getElementById("top-ext-target-temp").noUiSlider.on('slide', topExtTempSlide);
		document.getElementById("top-ext-target-temp").noUiSlider.on('change', topExtTempChange);
        document.getElementById("top-ext-target-temp").noUiSlider.on(
			'start',
			function() {
				document.getElementById("ext-target-temp").noUiSlider._clicked = true;
				document.getElementById("top-ext-target-temp").noUiSlider._clicked = true;
			}
        );
        document.getElementById("top-ext-target-temp").noUiSlider.on(
			'end',
			function() {
				document.getElementById("ext-target-temp").noUiSlider._clicked = false;
				document.getElementById("top-ext-target-temp").noUiSlider._clicked = false;
			}
        );
		$("#top-act-ext-temp .noUi-handle").remove();
	}
	// ===============================================================================
	//SLIDER EVENTS - BED
	document.getElementById("top-bed-target-temp").noUiSlider.on('slide', topBedTempSlide);
	document.getElementById("top-bed-target-temp").noUiSlider.on('change', topBedTempChange);
	document.getElementById("top-bed-target-temp").noUiSlider.on(
		'start',
		function() {
			document.getElementById("bed-target-temp").noUiSlider._clicked = true;
			document.getElementById("top-bed-target-temp").noUiSlider._clicked = true;
		}
	);
	document.getElementById("top-bed-target-temp").noUiSlider.on(
		'end',
		function() {
			document.getElementById("bed-target-temp").noUiSlider._clicked = false;
			document.getElementById("top-bed-target-temp").noUiSlider._clicked = false;
		}
	);
}


function topExtTempSlide(e){
    $("#top-bar-nozzle-target").html(parseInt(e[0]));
    
    $("#ext-degrees").html(parseInt(e[0]) + '&deg;C');
    
    if($("#ext-target-temp").length > 0){
    	document.getElementById('ext-target-temp').noUiSlider.set([parseInt(e[0])]);
    }
	
}

function topExtTempChange(e){
	jog_call("ext_temp", parseInt(e[0]));
}

function topBedTempSlide(e){
	
	$("#top-bar-bed-target").html(parseInt(e[0]));
	$("#bed-degrees").html(parseInt(e[0]) + '&deg;C');
    
    if($("#bed-target-temp").length > 0){
		document.getElementById('bed-target-temp').noUiSlider.set([parseInt(e[0])]);
    }
	
}

function topBedTempChange(e){
	
	jog_call("bed_temp", parseInt(e[0]));
}


function installHead(){
	document.location.href = '/fabui/maintenance/head?warning=1';
}

function directions(){
	var value = $(this).attr("data-attribue-direction");
	jog_call("directions", value);
}



function axisz(){
    
	var func = $(this).attr("data-attribute-function");
	var step = $(this).attr("data-attribute-step");
	jog_call(func, step);   
	    
}

function zero_all(){
	jog_call("zero_all", true);
}

function disable_button(element){
	$(element).addClass('disabled');
	$(element).prop("disabled",true);
}
		
		
function enable_button(element){
	$(element).removeClass('disabled');
	$(element).prop("disabled",false);
}

/** REFRESH DATABLE */
function RefreshTable(tableId, urlData)
{
	$(tableId + "_wrapper").css({ opacity: 0.3 });	
  	$.getJSON(urlData, null, function( json )
  	{
		table = $(tableId).dataTable();
		oSettings = table.fnSettings();
		table.fnClearTable(this);
		for (var i=0; i<json.aaData.length; i++)
		{
		  table.oApi._fnAddData(oSettings, json.aaData[i]);
		}
		oSettings.aiDisplay = oSettings.aiDisplayMaster.slice();
		table.fnDraw();
		$(tableId + "_wrapper").css({ opacity: 1 });
    
    });
}

/** analize serial response */
function analizeResponse(response) {
	var regex_endstop_hit = /echo:endstops\shit:\s\s([^a-z])/g;
	m = regex_endstop_hit.exec(response);
	if( m !== null){
		var axis = m[1];	
		$.smallBox({
			title : "Warning",
			content : axis + " endstop hit",
			color : "#C79121",
			iconSmall : "fa fa-warning bounce animated",
			timeout : 3000
		});
	}
}
/** */
function analizeMenu()
{
	var items_to_hide = ['feeder/engage', 'maintenance/4-axis'];
	var items_to_hide_lite = ['settings/raspi-cam', 'make/scan'];
	var a = $("nav li > a");

	a.each(function() {
		var link = $(this);
		var controller = link.attr('data-controller');

		if (jQuery.inArray( controller, items_to_hide ) >= 0 && SHOW_FEEDER == false) {
			link.remove();
		}
		if (jQuery.inArray( controller, items_to_hide_lite ) >= 0) {
			if ((FAB_LITE_LOWER <= hardware_id && hardware_id <= FAB_LITE_UPPER) || (is_custom && !has_camera))
				link.remove();
		}
	});
}
