var emberbase = require ('../lib/application');

var app = new emberbase ();

app
.route ('chat')
.interface ('chat')
.listen (8000);

