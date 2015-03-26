/*
 Fathom Experiments

 Copyright (C) 2015 Inria Paris-Roquencourt 

 The MIT License (MIT)

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
*/

/**
 * @fileoverview Demonstrating Fathom network delays measurements.
 * @author Anna-Kaisa Pietilainen <anna-kaisa.pietilainen@inria.fr> 
 */

var drawemptychart = function() {
    $('#chart').empty();
    MG.data_graphic({
	chart_type: 'missing-data',
	missing_text: 'Nothing here yet',
	target: '#chart',
	width: 0.75 * $('#chart').width(),
	height: 0.75 * $('#chart').width()/1.61,
	left: 30,
	right: 30,
	top: 30,
	bottom: 30
    });
};

var drawdatachart = function(data, legend, count) {
    MG.data_graphic({
	target: '#chart',
	width: 0.75 * $('#chart').width(),
	height: 0.75 * $('#chart').width()/1.61,
	left: 80,
	right: 5,
	top: 30,
	bottom: 40,
	interpolate : 'linear',
	x_accessor: 'date',
	show_secondary_x_label : true,
	y_accessor: 'value',
	y_autoscale: false,
	y_label: 'Round-trip-time (ms)',
	y_extended_ticks: true,
	format: 'count',
	area: false,
	data: data,
	legend : legend,
	legend_target : '#legend',
	aggregate_rollover : false,
	transition_on_update : false,
    });
};

var start = function(e) {
    var fathom = fathom || window.fathom;
    e.preventDefault();

    var error = function(msg) {
	$('#errorblock').html('<p>&nbsp;'+msg+'</p>');
	throw msg;	
    };

    var dst = $('#destination').val();
    if (dst.length<=0) {
	dst = $('#destinationlist').val();
	if (dst === 'none') {
	    error('No destination!');
	    return;
	}
    }

    var opt = {
	count : 10, 
	interval : 1.0
    }
    try {
	var tmp = parseInt($('#count').val());
	if (tmp && !isNaN(tmp))
	    opt.count = tmp;
    } catch (e) {
    }

    try {
	var tmp = parseInt($('#interval').val()) / 1000.0;
	if (tmp && !isNaN(tmp))
	    opt.interval = tmp;
    } catch (e) {	
    }

    // pings to compare
    var pings = {
	'sysping' : { enabled : $('#ping').prop('checked'),
		      data : [],
		      done : false,
		      legend : "System Ping"
		    },
	'udpping' : { enabled : $('#pingudp').prop('checked'),
		      data : [],
		      done : false,
		      legend : "Fathom UDP Ping"
		    },
	'wsping' : { enabled : $('#pingws').prop('checked'),
		     data : [],
		     done : false,
		     legend : "WebSocket Ping"
		   },
	'httpping' : { enabled : $('#pinghttp').prop('checked'),
		       data : [],
		       done : false,
		       legend : "Fathom HTTP Ping"
		     },
	'httpreqping' : { enabled : $('#pinghttpreq').prop('checked'),
			  data : [],
			  done : false,
			  legend : "HTTP Ping"
			}
    };

    // check the enabled
    var enabledpings = _.filter(_.values(pings), function(v) {
	return v.enabled;
    });
    if (enabledpings.length === 0) {
	error("No protocol selected!");
	return;
    }

    // init fathom with manifest
    var manifest = {
	'description' : 'Fathom Experiments - Network Delay Measurements.',
	'api' : [
	    'system.*',
	    'tools.*',
	],
	'destinations' : [dst]
    };

    fathom.init(function(res) {
    	if (res.error) {
	    fathom.close();
	    error('Init failed: ' + res.error.message);
	    return;
	}

	// pointers
	var legends = _.pluck(enabledpings, 'legend');
	var datas = _.pluck(enabledpings, 'data');

	// init with no data
	$('#chart').empty();
	drawdatachart(datas, legends, opt.count);

	// check if all measurements are done for cleanup
	var checkall = function() {
	    console.log('all done?',_.pluck(enabledpings, 'done'));
	    if (_.every(_.pluck(enabledpings, 'done'))) {
		// all done		
		fathom.close();
	    }
	};

	var updategraph = function() {
	    var candraw = _.every(_.map(enabledpings, function(d) {
		return (d.data.length>=2 || d.done);
	    }));

	    if (candraw) {
		drawdatachart(datas, legends, opt.count);
	    }
	}

	if (pings.httpreqping.enabled) {
	    var idx = 1;
	    var lopt = _.clone(opt);
	    lopt.proto = 'xmlhttpreq';
	    lopt.reports = true;
	    console.log('xmlhttpreq ping',dst,lopt);

	    fathom.tools.ping.start(function(res, done) {
    		if (res.error) {
		    console.error('xmlhttpreq ping error',res.error);
		    pings.httpreqping.done = true;
		    setTimeout(checkall,0);
		    return;
		}

		if (!done && res.time) {
		    pings.httpreqping.data.push({ 
			count : idx, 
			value : res.time,
			date : new Date(parseInt(res.rr))
		    });			
		    idx += 1;
		    updategraph();
		}

		pings.httpreqping.done = done;
		if (done) setTimeout(checkall,0);
	    }, dst, lopt, true);
	}

	if (pings.httpping.enabled) {
	    var idx = 1;
	    var lopt = _.clone(opt);
	    lopt.proto = 'http';
	    lopt.reports = true;
	    console.log('http ping',dst,lopt);

	    fathom.tools.ping.start(function(res, done) {
    		if (res.error) {
		    console.error('http ping error',res.error);
		    pings.httpping.done = true;
		    setTimeout(checkall,0);
		    return;
		}

		if (!done && res.time) {
		    pings.httpping.data.push({ 
			count : idx, 
			value : res.time,
			date : new Date(parseInt(res.rr))
		    });			
		    idx += 1;
		    updategraph();
		}

		pings.httpping.done = done;
		if (done) setTimeout(checkall,0);
	    }, dst, lopt, true);
	}

	if (pings.wsping.enabled) {
	    var idx = 1;
	    var lopt = _.clone(opt);
	    lopt.proto = 'ws';
	    lopt.reports = true;
	    console.log('ws ping',dst,lopt);

	    fathom.tools.ping.start(function(res, done) {
    		if (res.error) {
		    console.error('ws ping error',res.error);
		    pings.wsping.done = true;
		    setTimeout(checkall,0);
		    return;
		}

		if (!done && res.time) {
		    pings.wsping.data.push({ 
			count : idx, 
			value : res.time,
			date : new Date(parseInt(res.rr))
		    });			
		    idx += 1;
		    updategraph();
		}

		pings.wsping.done = done;
		if (done) setTimeout(checkall,0);
	    }, dst, lopt, true);
	}

	if (pings.udpping.enabled) {
	    var idx = 1;
	    var lopt = _.clone(opt);
	    lopt.proto = 'udp';
	    lopt.reports = true;
	    console.log('udp ping',dst,lopt);

	    fathom.tools.ping.start(function(res, done) {
    		if (res.error) {
		    console.error('udp ping error',res.error);
		    pings.udpping.done = true;
		    setTimeout(checkall,0);
		    return;
		}

		if (!done && res.time) {
		    pings.udpping.data.push({ 
			count : idx, 
			value : res.time,
			date : new Date(parseInt(res.rr))
		    });			
		    idx += 1;
		    updategraph();
		}

		pings.udpping.done = done;
		if (done) setTimeout(checkall,0);
	    }, dst, lopt, true);
	}

	if (pings.sysping.enabled) {
	    var lopt = _.clone(opt);
	    console.log('sysping',dst,lopt);
	    fathom.system.doPing(function(res, done) {
    		if (res.error) {
		    console.error('system ping error',res.error);
		    pings.sysping.done = true;
		    setTimeout(checkall,0);
		    return;
		}

		if (!done && res.result && res.result.rtt) {
		    // add new results
		    var redraw = false;
		    _.each(res.result.rtt, function(v,idx) {
			if (idx == pings.sysping.data.length) {
			    pings.sysping.data.push({ 
				count : idx+1, 
				value : v,
				date : new Date()
			    });
			    redraw = true; // new value
			}
		    });
		    if (redraw)
			updategraph();
		}

		pings.sysping.done = done;
		if (done) setTimeout(checkall,0);
	    }, dst, lopt, true); // doPing
	}
    }, manifest);
};

$(window).load(function() {
    drawemptychart();
    var fathom = fathom || window.fathom;
    if (!fathom) {
	$('#errorblock').html('<p>&nbsp;You must <a href="../fathom.xpi">install Fathom</a> first!</p>');
	throw "Fathom not found";
    }

    $('#start').click(start);
});

