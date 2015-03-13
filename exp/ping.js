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
	error: 'No data available',
	chart_type: 'missing-data',
	missing_text: 'No data available',
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
	x_accessor: 'count',
	y_accessor: 'value',
	min_x: 0,
	max_x: count,
	x_label: 'Count',
	x_scale_type: 'log',
	show_secondary_x_label : false,
	min_y: 0.1,
	max_y: 10000,
	y_autoscale: false,
	y_scale_type: 'log',
	y_label: 'Round-trip-time (ms)',
	y_extended_ticks: true,
	area: false,
	data: data,
	legend : legend,
	legend_target : '#legend',
	transition_on_update : true
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
	if (dst === 'none')
	    return error('No destination!');
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

    console.log(opt);

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

	var data = {
	    'sysping' : []
	};

	// init with no data
	$('#chart').empty();
	drawdatachart([data.sysping], ['system ping'], opt.count);

	fathom.system.doPing(function(res) {
    	    if (res.error) {
		fathom.close();
		error('System ping failed: ' + res.error.message);
		return;
	    }

	    if (!res.done && res.result.rtt.length > 0) {
		_.each(res.result.rtt, function(v,idx) {
		    if (idx == data.sysping.length)
			data.sysping.push({ count : idx+1, value : v});
		});

		console.log(data.sysping);

		drawdatachart([data.sysping], ['system ping'], opt.count);
	    }

	}, dst, opt, true);
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

