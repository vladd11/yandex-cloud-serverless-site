This note are created for future developers.
Mapbox places don't provide us house number so we need to use Nominatim.
This might be unacceptable for somebody, so you are free to use this method:

Install mapbox vector tiles parser.

    npm install @mapbox/vector-tile

Then use [this algorithm](https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames).
And request **vector** tile using this URL: https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/20/{x}/{y}.mvt?access_token={token}
20 might be any zoom number. 
You need to assume that:
- There only one building in this zoom area
- House number is visible.

Okay, let's parse it.

Imports

    const VectorTile = require('@mapbox/vector-tile').VectorTile;
    const Protobuf = require('pbf');
    
Then parse tile. Data should be any byte buffer.

    const tile = new VectorTile(new Protobuf(data));

Here we go.

    tile.layers.housenum_label

But I'll choose geokeo.com cause it's much simpler.
You will get 75000 request/month for free, instead of 100000 when using Mapbox, and it's easier to self-host.
