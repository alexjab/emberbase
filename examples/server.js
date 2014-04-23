var emberbase = require ('../lib/application');

var app = new emberbase ();

app
.store ()
.route ('/chat')
.listen (8000);

