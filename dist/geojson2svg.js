(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.geojson2svg = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
//index.js 
(function() { 
	var singles = ['Point', 'LineString', 'Polygon'];
	var multies = ['MultiPoint', 'MultiLineString', 'MultiPolygon'];
	function explode(g) {
	  if( multies.indexOf(g.type) > -1) {
	    return g.coordinates.map(function(part) {
	      var single = {};
	      single.type = g.type.replace('Multi','');
	      single.coordinates = part;
        if(g.crs) single.crs = g.crs;
	      return single;
	    });  
	  } else {
	    return false;
	  }
	}
	function implode(gs) {
	  var sameType = gs.every(function(g) { 
	    return singles.indexOf(g.type) > -1;
	  })
    var crs = gs[0].crs || 0;
    var sameCrs = gs.every(function(g) {
      var gcrs = g.crs || 0;
      return gcrs == crs;
    });
	  if(sameType && sameCrs) {
	    var multi = {};
	    multi.type = 'Multi' + gs[0].type;
	    multi.coordinates = [];
      if(crs != 0) multi.crs = crs;
	    gs.forEach(function(g) {
	      multi.coordinates.push(g.coordinates);
	    });
	    return multi;
	  } else {
	    return false;
	  }
	};
	var multigeojson = {
	  explode: explode,
	  implode: implode
	};
	if(typeof module !== 'undefined' && module.exports) {
	  module.exports = multigeojson;
	} else if(window) {
	  window.multigeojson = multigeojson;
	}
})();

},{}],2:[function(require,module,exports){
//converter.js
var multi = require('multigeojson');
function getCoordString(coords,res,origin, precision) {
  //origin - svg image origin
  var convertedCoords = coords.map(function(coord) {
    return [(coord[0] - origin.x)/res, (coord[1] - origin.y)/res];
  });
  var coordStr = convertedCoords.map(function (coord) {
    if (precision) {
      return coord[0].toFixed(precision) + ',' + coord[1].toFixed(precision);
    } else {
      return coord[0] + ',' + coord[1];
    }
  });
  return coordStr.join(' ');
}
function addAttributes(ele,attributes) {
  var part = ele.split('/>')[0];
  for(var key in attributes) {
    if(attributes[key]) {
      part += ' ' + key + '="' + attributes[key] + '"';
    }
  }
  return part + ' />';
}

function point(geom,res,origin,opt) {
  var r = opt && opt.r ? opt.r : 1;
  var pointAsCircle = opt && opt.hasOwnProperty('pointAsCircle')
    ? opt.pointAsCircle : false;
  var coords = getCoordString([geom.coordinates],res,origin,opt.precision);
  if (pointAsCircle) {
    return [coords];
  } else {
    return [
      'M' + coords
      + ' m'+ -r+ ',0'+ ' a'+r+','+ r + ' 0 1,1 '+ 2*r + ','+0
      + ' a'+r+','+ r + ' 0 1,1 '+ -2*r + ','+0
    ];
  }
}
function multiPoint(geom,res,origin,opt) {
  var explode = opt && opt.hasOwnProperty('explode') ? opt.explode : false;
  var paths = multi.explode(geom).map(function(single) {
    return point(single,res,origin,opt)[0];
  });
  if(!explode) return [paths.join(' ')];
  return paths;

}
function lineString(geom,res,origin,opt) {
  var coords = getCoordString(geom.coordinates,res,origin,opt.precision);
  var path = 'M'+ coords;
  return [path];
}
function multiLineString(geom,res,origin,opt) {
  var explode = opt && opt.hasOwnProperty('explode') ? opt.explode : false;
  var paths = multi.explode(geom).map(function(single) {
    return lineString(single,res,origin,opt)[0];
  });
  if(!explode) return [paths.join(' ')];
  return paths;
}
function polygon(geom,res,origin,opt) {
  var mainStr,holes,holeStr;
  mainStr = getCoordString(geom.coordinates[0],res,origin,opt.precision);
  if (geom.coordinates.length > 1) {
    holes = geom.coordinates.slice(1,geom.coordinates.length);
  }
  var path = 'M'+ mainStr;
  if(holes) {
    for(var i=0;i<holes.length; i++) {
      path += ' M' +  getCoordString(holes[i],res,origin,opt.precision);
    }
  }
  path += 'Z';
  return [path];
}
function multiPolygon(geom,res,origin,opt) {
  var explode = opt.hasOwnProperty('explode') ? opt.explode : false;
  var paths = multi.explode(geom).map(function(single) {
    return polygon(single,res,origin,opt)[0];
  });
  if(!explode) return [paths.join(' ').replace(/Z/g,'') + 'Z'];
  return paths;
}
module.exports = {
  Point: point,
  MultiPoint: multiPoint,
  LineString: lineString,
  MultiLineString: multiLineString,
  Polygon: polygon,
  MultiPolygon: multiPolygon
};

},{"multigeojson":1}],3:[function(require,module,exports){
// extend.js
// extend b to a with shallow copy
module.exports = function(a, b) {
  var c = {}
  Object.keys(a).forEach(function(key) {
    c[key] = a[key]
  })
  Object.keys(b).forEach(function(key) {
    c[key] = b[key]
  })
  return c
} 

},{}],4:[function(require,module,exports){
var extend = require('./extend.js');
var converter = require('./converter.js');

//g2svg as geojson2svg (shorthand)
var g2svg = function(options) {
  this.options = options || {};
  this.viewportSize = this.options.viewportSize ||
    {width: 256, height: 256};
  this.mapExtent = this.options.mapExtent ||
    {
      left: -20037508.342789244,
      right: 20037508.342789244,
      bottom: -20037508.342789244,
      top: 20037508.342789244
    };
  this.res = this.calResolution(this.mapExtent,this.viewportSize,
    this.options.fitTo);
};
g2svg.prototype.calResolution = function(extent,size,fitTo) {
  var xres = (extent.right - extent.left)/size.width;
  var yres = (extent.top - extent.bottom)/size.height;
  if (fitTo) {
    if (fitTo.toLowerCase() === 'width') {
      return xres;
    } else if (fitTo.toLowerCase() === 'height') {
      return yres;
    } else {
      throw new Error('"fitTo" option should be "width" or "height" ');
    }
  } else {
    return Math.max(xres,yres);
  }
};
g2svg.prototype.convert = function(geojson,options)  {
  var opt = extend(this.options, options || {});
  var multiGeometries = ['MultiPoint','MultiLineString','MultiPolygon'];
  var geometries = ['Point', 'LineString', 'Polygon'];
  var svgElements = [];
  if (geojson.type == 'FeatureCollection') {
    for(var i=0; i< geojson.features.length; i++) {
      svgElements = svgElements.concat(
        this.convertFeature(geojson.features[i],opt));
    }
  } else if (geojson.type == 'Feature') {
    svgElements = this.convertFeature(geojson,opt);
  } else if (geojson.type == 'GeometryCollection') {
    for(var i=0; i< geojson.geometries.length; i++) {
      svgElements = svgElements.concat(
        this.convertGeometry(geojson.geometries[i],opt));
    }
  } else if (converter[geojson.type]) {
    svgElements = this.convertGeometry(geojson,opt);
  } else {
    return;
  }
  if(opt.callback) opt.callback.call(this,svgElements);
  return svgElements;
};
g2svg.prototype.convertFeature = function(feature,options) {
  if(!feature && !feature.geometry) return;
  var opt = extend(this.options, options || {});
  if (opt.attributes && opt.attributes instanceof Array) {
    var arr = opt.attributes
    opt.attributes = arr.reduce(function(sum, property) {
      if (typeof(property) === 'string') {
        var val, key = property.split('.').pop()
        try {
          val = valueAt(feature, property)
        } catch(e) {
          val = false
        }
        if (val) sum[key] = val
      } else if (typeof(property) === 'object' && property.type
        && property.property)
      {
        if (property.type === 'dynamic') {
          var val, key = property.key ? property.key
            : property.property.split('.').pop()
          try {
            val = valueAt(feature, property.property)
          } catch(e) {
            val = false
          }
          if (val) sum[key] = val
        } else if (property.type === 'static'  && property.value) {
          sum[property.property] = property.value
        }
      }
      return sum
    }, {})
  } else {
    opt.attributes = opt.attributes || {};
  }
  var id = opt.attributes.id || feature.id ||
    (feature.properties && feature.properties.id
    ? feature.properties.id : null);
  if (id) opt.attributes.id = id;
  return this.convertGeometry(feature.geometry,opt);
};
g2svg.prototype.convertGeometry = function(geom,options) {
  if(converter[geom.type]) {
    var opt = extend(this.options, options || {});
    var output = opt.output || 'svg';
    var paths = converter[geom.type].call(this,geom,
      this.res,
      {x:this.mapExtent.left,y:this.mapExtent.top},
      opt
    );
    var svgJsons,svgEles;
    if (output.toLowerCase() == 'svg') {
      svgJsons = paths.map(function(path) {
        return pathToSvgJson(path,geom.type,opt.attributes,opt);
      });
      svgEles = svgJsons.map(function(json) {
        return jsonToSvgElement(json,geom.type,opt);
      });
      return svgEles;
    } else {
      return paths;
    }
  } else {
    return;
  }
};

function pathToSvgJson(path,type,attributes,opt) {
  var svg = {};
  var pointAsCircle = opt && opt.hasOwnProperty('pointAsCircle')
    ? opt.pointAsCircle : false;
  if((type == 'Point' || type == 'MultiPoint') && pointAsCircle) {
    svg['cx'] = path.split(',')[0];
    svg['cy'] = path.split(',')[1];
    svg['r'] = opt && opt.r ? opt.r : '1';
  } else {
    svg = {d: path};
    if(type == 'Polygon' || type == 'MultiPolygon') {
      svg['fill-rule'] == 'evenodd';
    }
  }
  for (var key in attributes) {
    svg[key]= attributes[key];
  }
  return svg;
};

function jsonToSvgElement(json,type,opt) {
  var pointAsCircle = opt && opt.hasOwnProperty('pointAsCircle')
    ? opt.pointAsCircle : false;
  var ele ='<path';
  if((type == 'Point' || type == 'MultiPoint') && pointAsCircle) {
    ele = '<circle';
  }
  for(var key in json) {
    ele += ' ' + key +'="' + json[key] + '"';
  }
  ele += '/>';
  return ele;
}

function valueAt(obj,path) {
  //taken from http://stackoverflow.com/a/6394168/713573
  function index(prev,cur, i, arr) {
    if (prev.hasOwnProperty(cur)) {
      return prev[cur];
    } else {
      throw new Error(arr.slice(0,i+1).join('.') + ' is not a valid property path');
    }
  }
  return path.split('.').reduce(index, obj);
}
module.exports = g2svg;

},{"./converter.js":2,"./extend.js":3}],5:[function(require,module,exports){
var g2svg = require('./instance.js');
var geojson2svg = function(options) {
  return new g2svg(options);
};

module.exports = geojson2svg;

},{"./instance.js":4}]},{},[5])(5)
});
//# sourceMappingURL=geojson2svg.js.map
