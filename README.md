emberbase
=========

A *cheap* Firebase clone.

Emberbase is a self-hosted Firebase clone. It is currently in an early development stage.

License: MIT

##Installation
Emberbase runs on Node.js; to start using it, just run:
```
npm install emberbase
```

##Use
###Server
To create a Emberbase server, you need to create a server file and create your app:

`server.js`:
```
var emberbase = require ('emberbase');

var app = new emberbase ();

app.route ('my_application');
app.interface ('my_application');
app.listen (8000);
```

###Client
Emberbase currently only supports in-browser javascript:

`index.html`:
```
<script src="http://localhost:8000/static/js/emberbase.min.js"></script>
<script>
var eb = new Emberbase ('http://localhost:8000/my_application');

eb.set ({name: 'Alex Terieur'});

eb.on ('value', function(data) {
  if (data.val) {
    console.log ('My name is ' + data.val.name);
  }
});
</script>
```

##Documentation
###Server methods

####Emberbase.route
`Emberbase.route (route [String][Mandatory]) [Mandatory]`

Specify a new database name, usually based on your application. Every application that will connect to this route will share the same database.

WARNING: Routes must start **without** a `/`.

The URL that must be called from the client-side is `http://host:port/<route>` (see example above).

####Emberbase.interface
`Emberbase.interface (route [String][Mandatory]) [Optional]`

Create a web interface to visualize your data. The URL to access the interface for a specific route is `http://host:port/<route>` (the same as the emberbase client URL).

####Emberbase.listen
`Emberbase.listen (port [Integer]) [Mandatory]`

Tells your Emberbase server to listen.

###Client methods
####Emberbase
`new Emberbase (url [String][Mandatory]) [Mandatory]`

Construct the Emberbase client object with the URL of your application as parameter. The URL must the form of `http://host:port/<route>`, where `route` is a route you created with your server (see example above).

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

License: MIT
