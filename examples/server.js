var emberbase = require ('../lib/application');

var app = new emberbase ();

app
.listen (8000)
.store ()
.route ('/chat');

