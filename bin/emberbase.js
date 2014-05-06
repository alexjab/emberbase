#!/usr/bin/env node

var fs = require ('fs');
var program = require ('commander');
var prompt = require ('prompt');
prompt.message = '';
prompt.delimiter = '';
prompt.colors = false;

var collect = function (val, memo) {
  memo.push (val);
  return memo;
};

var bool = function (val, memo) {
  return true;
};

var number = function (num) {
  return parseInt (num);
};

program
  .version ('0.3.6')
  .usage ('[options]')
  .option ('-t, --tldr', 'TL;DR (you can ignore everything that comes after)', bool)
  .option ('-r, --route [route]', 'add a route to your base', collect, [])
  .option ('-i, --interface [route]', 'setup a web interface for the specified route', collect, [])
  .option ('-a, --all-routes', 'setup a web interface for all the routes', bool)
  .option ('-p, --port [number]', 'specify the port number to listen to', number, 8000);

program.on ('--help', function () {
  console.log ('  Examples:');
  console.log ('');
  console.log ('    TL;DR:');
  console.log ('      $ emberbase -t');
  console.log ('');
  console.log ('    Create a database for your application my_app:');
  console.log ('      $ emberbase -r my_app');
  console.log ('');
  console.log ('    The same but with a web interface to view your data:');
  console.log ('      $ emberbase -r my_app -i my_app');
  console.log ('');
  console.log ('    The same but with several routes:');
  console.log ('      $ emberbase -r my_app1 -r my_app2 -r my_app3 -i my_app1 -i my_app2 -i my_app3');
  console.log ('');
  console.log ('    The same but shorter:');
  console.log ('      $ emberbase -r my_app1 -r my_app2 -r my_app3 -a');
  console.log ('');
  console.log ('    With a different port:');
  console.log ('      $ emberbase -r my_app1 -p 3000');
});

program.parse (process.argv);

var file = "";
if (program.tldr) {
  file = "var emberbase = require('emberbase');\n";
  file += "\n";
  file += "var app = new emberbase();\n";
  file += "\n";
  file += "app.route('my_app');\n";
  file += "//app.route('my_other_app');\n";
  file += "//app.route('my_other_other_app');\n";
  file += "\n";
  file += "app.interface('my_app');\n";
  file += "//app.interface('my_other_app');\n";
  file += "//app.interface('my_other_other_app');\n";
  file += "\n";
  file += "app.listen(8000);\n";
} else {
  if (!program.route.length) {
    program.help ();
  } else {
    file = "var emberbase = require('emberbase');\n";
    file += "\n";
    file += "var app = new emberbase();\n";
    file += "\n";
    program.route.forEach (function (route) {
      file += "app.route('"+route+"');\n";
    });
    file += "\n";
    if (program.allRoutes) {
      program.route.forEach (function (route) {
        file += "app.interface('"+route+"');\n";
      });
      file += "\n";
    } else {
      if (program.interface.length) {
        program.interface.forEach (function (route) {
          file += "app.interface('"+route+"');\n";
        });
        file += "\n";
      }
    }
    file += "app.listen("+(program.port||8000)+");\n";
  }
}

if (file) {
  var exists = fs.existsSync ('./emberbase_server.js');
  if (exists) {
    var property = {
      name: 'overwrite',
      message: 'The file \x1B[36memberbase_server.js\x1B[39m already exists. Overwrite ?[y/n]',
    };
    prompt.get (property, function (err, result) {
      if (result.overwrite === 'y') {
        fs.writeFileSync ('emberbase_server.js', file);
        console.log ('File\x1B[36m emberbase_server.js\x1B[39m written.');
      } else {
        console.log ('\x1B[31mAborting, no file has been written.\x1B[39m');
      }
    });
  } else {
    fs.writeFileSync ('emberbase_server.js', file);
    console.log ('File\x1B[36m emberbase_server.js\x1B[39m written.');
  }
}

