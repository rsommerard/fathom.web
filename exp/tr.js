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
 * @fileoverview Demonstrating Fathom traceroute measurements.
 * @author Anna-Kaisa Pietilainen <anna-kaisa.pietilainen@inria.fr> 
 */
var start = function(e, fathom, map) {
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

    // defaults
    var opt = {
        count : 3,
        timeout : 5,
        maxttl : 30 
    };
    _.each(['count','timeout','maxttl'], function(p) {
        try {
            var tmp = parseInt($('#'+p).val());
            if (tmp && !isNaN(tmp))
                opt[p] = tmp;
        } catch (e) {
        }        
    });

    console.log(dst, JSON.stringify(opt));

    var manifest = {
        'description' : 'Fathom Experiments - Geo-Traceroute.',
        'api' : [
            'system.doTraceroute'
        ],
        'destinations' : [dst]
    };

    fathom.init(function(res) {
        if (res.error) {
            fathom.close();
            error('Init failed: ' + res.error.message);
            return;
        }

        $('.fa-spinner').show();   

        fathom.system.doTraceroute(function(res) {
            $('.fa-spinner').hide();   

            if (res.error) {
                fathom.close();
                error("Traceroute failed: " + res.error.message);
                return;
            }

            console.log(res.result);

            var c = map.getCenter();            
            var hops = [[c.lat, c.lng]]; // user location
            var bounds = undefined;

            var handlehop = function(i) {
                if (i >= res.result.hops.length)
                    return; // done

                if (res.result.hops[i] && res.result.hops[i].address) {
                    var ip = res.result.hops[i].address;
                    $.ajax({
                        url: "https://stat.ripe.net/data/geoloc/data.json?resource="+ip
                    }).done(function(ares) {
                        if (ares && ares.status == 'ok' && ares.data.locations.length>0) {
                            var l = ares.data.locations[0];
                            var loc = [l.latitude, l.longitude];
                            hops.push(loc);
                            var h = hops.length;

                            console.log(ip,loc);

                            if (ip === res.ip) {
                                var m = L.circleMarker(loc, {
                                        radius: 7,
                                    color: '#0CC225',
                                    fillColor: '#0CC225',
                                    fillOpacity: 0.5
                                }).addTo(map);
                                m.bindPopup('<div class="popup">'+h+'. '+ip+' [destination]</div>');

                            } else {
                                var m = L.circleMarker(loc, {
                                    radius: 7,
                                    color: '#C20C25',
                                    fillColor: '#C20C25',
                                    fillOpacity: 0.5
                                }).addTo(map);
                                m.bindPopup('<div class="popup">'+h+'. '+ip+'</div>');
                            }

                            // line between last two hops
                            L.polyline(hops.slice(hops.length-2), {color: '#330000', weight: 2}).addTo(map);

                            // re-zoom
                            if (!bounds) {
                                // first two items
                                bounds = L.latLngBounds(hops);
                            } else {
                                // add new point
                                bounds = bounds.extend(hops[hops.length-1]);
                            }

                            map.fitBounds(bounds, { padding : [20,20]});
                        }
                        handlehop(i+1);
                    }); //ajax
                } else {
                    handlehop(i+1);
                }
            };

            handlehop(0);

        }, dst, opt);
    }, manifest); // init
}; // start

$(window).load(function() {
    $('.fa-spinner').hide();   

    var fathom = fathom || window.fathom;
    if (!fathom) {
        $('#errorblock').html('<p class="highlight">You must install first the <a href="../fathom.xpi">Fathom extension</a>. If you have installed Fathom, make sure that you have enabled the Fathom API (<i>Menu -> Add-ons -> Extensions -> Fathom -> Preferences -> Enable Fathom API for Regural Web Pages</i>).</p>');
        throw "Fathom not found";
    }

    // setup the leaflet map
    var tileurl = 'http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png';

    var map = L.map('map');

    var tiles = L.tileLayer(tileurl, {
        attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(map);

    // zoom to the user location    
    var src = undefined;
    var srccoords = undefined;
    map.locate({ setView : true });
    map.on('locationfound', function(e) {
        console.log(e.latlng);
        srccoords = e.latlng;
        src = L.circleMarker(e.latlng, {
            radius: 7,
            color: '#C20C25',
            fillColor: '#C20C25',
            fillOpacity: 0.5
        }).addTo(map);
        src.bindPopup('<div class="popup">0. You!</div>');
        map.setView(srccoords, 7);
    });

    map.on('locationerror', function(e) { 
        console.log('failed to get user location!');
    });

    $('#start').click(function(e) {
        // clear the map from previous traces and re-zoom to the user
        map.eachLayer(function (layer) {
            if (layer !== src && layer !== tiles)
                map.removeLayer(layer);
        });
        map.setView(srccoords, 7);
        start(e, fathom, map);
    });        
});