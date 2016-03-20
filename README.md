(No longer maintained) emberbase ![emberbase](http://i.imgur.com/4XAlISQ.png)
=========
[![NPM version](https://badge.fury.io/js/emberbase.svg)](http://badge.fury.io/js/emberbase)

A *cheap* Firebase clone.

Emberbase is a self-hosted Firebase clone. It is currently in an early development stage, unexpected results might happen and things might break.

License: MIT

##Installation
Emberbase runs on Node.js; to install it globally, just run:
```
npm install emberbase -g
```

##Use

###Server
To start an Emberbase server, just do:
```
emberbase
```

Emberbase creates a configuration file named `emberbase_conf.json`. It contains the username and password for the administration page (`http://localhost:port`) as well as the port number of the server.
The default username/password/port is `admin`/`admin`/`8000`.

The server gets its configuration from the aforementioned config file, but you can override its values with the folowing options:

  - `-p, --port`: a port number (default is `8000`),
  - `-u, --username`: a username for the admin interface (default is `admin`),
  - `-v, --password`: a password for the admin interface (default is `admin`),

And you can save those values to the configuration file by adding the `-s, --save` flag.

The order in which settings are applied is the following:

`command line options` > `configuration file` > `admin/admin/8000`.

If you need this help from the command line, write:
```
emberbase --help
```

###Client

The Emberbase client is a browser javascript library. It is bundled with the server and you just need to add this to your code:
```
<script src="/emberbase.min.js"></script>
```

####Emberbase
`new Emberbase (url [String][Mandatory]) [Mandatory]`

Construct the Emberbase client object with the URL of your application as parameter. The URL must the form of `http://host:port/<route>`, where `route` is a route you created from the interface.

####Emberbase.set
`Emberbase.set (data [JSON][Mandatory])`

Write data to your database. Overwrite any data that is already present.

####Emberbase.push
`Emberbase.push (data [JSON][Mandatory])`

Write data to your database. Add data to your database as a list item. If the list does not exist (or the value stored is not a list but a single value inserted with the `set` command), any value already present is deleted and a new list is created.

####Emberbase.on
`Emberbase.on (event [String][Mandatory], callback [Function][Mandatory])`

Listen to events on your database.

###Client events

####value
`value`

This event is fired when data is inserted to the database using the `set` command. It is fired upon instanciation of the Emberbase client if the base already contains data, and every time a client saves new data to the database.

####child_added
`child_added`

This event is fired when data is appended to a list using the `push` command. It is fired upon instanciation of the Emberbase client if the base already contains data, and every time a client pushes new data to the database.

###Testing
Tests are on their way.

###Misc.
Emberbase is built with [socket.io](https://github.com/Automattic/socket.io) and [express](https://github.com/visionmedia/express).
You should also check out [nvm](https://github.com/creationix/nvm), which provides a great virtual environment for node.

### License
MIT

The MIT License (MIT)

Copyright (c) 2014 Alexandre Jablon <alex@jablon.me>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
