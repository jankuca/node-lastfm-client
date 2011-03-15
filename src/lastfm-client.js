var http, path;
http = require('http');
path = require('path');

if (typeof Function.inherit !== 'function') {
	require('../lib/utils/utils.js');
}

module.exports.Client = Function.inherit(function (params) {
	if (!params.api_key) {
		throw new Error('Missing API key');
	}
	if (!params.secret) {
		throw new Error('Missing API key');
	}

	Object.defineProperty(this, 'API_KEY', {
		'value': params.api_key,
	});
	Object.defineProperty(this, 'API_SECRET', {
		'value': params.api_key,
	});
	Object.defineProperty(this, 'API_ROOT', {
		'value': params.root || '/',
	});
}, {
	'get': function (api_method, params, callback) {
		if (typeof callback !== 'function') {
			throw new Error('Missing callback function');
		}

		this._request('GET', api_method, params, function (status, data) {
			if (status !== 200) {
				return callback(new Error('API call failed: HTTP status code ' + status));
			}
			callback(null, data.results);
		});
	},

	'post': function (api_method, params, callback) {
		this._request('POST', api_method, params, function (status, data) {
			if (status >= 300) {
				return callback(new Error('API call failed: HTTP status code ' + status));
			}
			callback(null, data);
		});
	},

	'_request': function (http_method, api_method, params, callback) {
		var uri, request;

		this._fixParams(params);
		params.method = api_method;

		uri = Object.getOwnPropertyNames(params).map(function (key) {
			return key + '=' + encodeURIComponent(params[key]);
		}).join('&');

		request = http.request({
			'host': 'ws.audioscrobbler.com',
			'port': 80,
			'method': http_method.toUpperCase(),
			'path': path.join(this.API_ROOT, '/?' + uri),
		}, function (response) {
			var data = '';
			response.on('data', function (chunk) {
				data += chunk;
			});
			response.on('end', function () {				
				callback(this.statusCode, JSON.parse(data));
			});
		});
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