var crypto = require('crypto');
var http = require('http');
var path = require('path');
var Buffer = require('buffer').Buffer;

if (typeof Function.inherit !== 'function') {
	require('utils/utils.js');
}

module.exports.Client = Function.inherit(function (params) {
	if (!params.api_key) {
		throw new Error('Missing API key');
	}
	if (!params.secret) {
		throw new Error('Missing API key');
	}

	this.api_version = params.version || '2.0';

	Object.defineProperty(this, 'API_KEY', {
		'value': params.api_key,
	});
	Object.defineProperty(this, 'API_SECRET', {
		'value': params.secret,
	});
	Object.defineProperty(this, 'API_ROOT', {
		'value': '/' + this.api_version + '/',
	});
}, {
	'getAuthURL': function (callback_url) {
		if (!callback_url) {
			throw new Error('Missing auth callback URL');
		}

		return 'http://www.last.fm/api/auth/?api_key=' + encodeURIComponent(this.API_KEY) + '&cb=' + encodeURIComponent(callback_url);
	},

	'get': function (api_method, params, callback) {
		if (typeof callback !== 'function') {
			throw new Error('Missing callback function');
		}

		this._request('GET', api_method, params, function (status, data) {
			if (status !== 200) {
				return callback(new Error('API call failed: HTTP status code ' + status));
			}
			if (data === null) {
				return callback(new Error('Invalid response'));
			}
			if (data.error) {
				return callback(new Error('API call failed: API error code ' + data.error));
			}
			callback(null, data.results ? data.results : data);
		});
	},

	'post': function (api_method, params, callback) {
		this._request('POST', api_method, params, function (status, data) {
			if (status >= 300) {
				return callback(new Error('API call failed: HTTP status code ' + status));
			}
			if (data !== null && data.error) {
				return callback(new Error('API call failed: API error code ' + data.error));
			}
			callback(null, data);
		});
	},

	'scrobble': function (sk, tracks, callback) {
		var params = {},
			ts = Math.floor(new Date().getTime() / 1000);
		if (tracks instanceof Array) {
			tracks.forEach(function (track, i) {
				params['timestamp[' + i + ']'] = ts;
				Object.keys(track).forEach(function (key) {
					params[key + '[' + i + ']'] = track[key];
				});
			});
		} else {
			params['timestamp'] = ts;
			Object.keys(tracks).forEach(function (key) {
				params[key] = tracks[key];
			});
		}
		params.sk = sk;
		return this.post('track.scrobble', params, callback);
	},

	'updateNowPlaying': function (sk, track, callback) {
		var params = {};
		Object.keys(track).forEach(function (key) {
			params[key] = track[key];
		});
		params.sk = sk;
		return this.post('track.updateNowPlaying', params, callback);
	},

	'love': function (sk, track, callback) {
		var params = {};
		Object.keys(track).forEach(function (key) {
			params[key] = track[key];
		});
		params.sk = sk;
		return this.post('track.love', params, callback);
	},

	'_request': function (http_method, api_method, params, callback) {
		var keys, uri, sig, request;

		http_method.toUpperCase();

		this._fixParams(params);
		params.method = api_method;

		if (http_method !== 'GET' || params.api_sig === true) {
			keys = [];
			sig = Object.keys(params).sort().map(function (key) {
				if (key !== 'api_sig' && key !== 'format') {
					keys.push(key);
					return key + params[key];
				} else {
					return '';
				}
			}).join('');
			sig += this.API_SECRET;
			sig = crypto.createHash('md5').update(sig).digest("hex");
			params.api_sig = sig;
			keys = keys.concat('api_sig', 'format');
		} else {
			keys = Object.keys(params).sort();
		}
		uri = keys.map(function (key) {
			return key + '=' + encodeURIComponent(params[key]);
		}).join('&');

		request = http.request({
			'host': 'ws.audioscrobbler.com',
			'port': 80,
			'method': http_method,
			'path': (http_method === 'GET') ? path.join(this.API_ROOT, '/?' + uri) : this.API_ROOT,
			'headers': (http_method !== 'GET') ? {
				'content-type': 'application/x-www-form-urlencoded',
				'content-length': uri.length,
			} : {},
		}, function (response) {
			var data = '';
			response.on('data', function (chunk) {
				data += chunk;
			});
			response.on('end', function () {
				callback(this.statusCode, data.length !== 3 ? JSON.parse(data) : null);
			});
		});
		if (http_method !== 'GET') {
			request.write(uri);
		}
		request.end();
	},

	'_fixParams': function (params) {
		if (!params.api_key) {
			params.api_key = this.API_KEY;
		}
		if (!params.format) {
			params.format = 'json';
		}
	},
});