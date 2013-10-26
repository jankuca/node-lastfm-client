# node-lastfm-client

Node.js Last.fm Client Library

## Example

var LastfmClient = require('lastfm-client').Client;

var api = new LastfmClient({
	'api_key': '[your api key]',
	'secret': '[your secret]'
});

api.get('user.getRecentTracks', {'user': '[target username]'}, function(err, data) {
	if (!err && data && data.recenttracks) {
		for (var i = 0, l = data.recenttracks.track.length; i < l; ++i) {
			var track = data.recenttracks.track[i];
			if (track['@attr'] && track['@attr'].nowplaying) {
				console.log('Just playing', track.name, 'by', track.artist['#text']);
			}
		}
	}
});
