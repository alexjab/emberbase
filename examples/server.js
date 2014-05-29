var emberbase = require ('../lib/application');

var app = new emberbase ();

app
.addRoute ('chat')
.interface ('chat')
.listen (8000);

