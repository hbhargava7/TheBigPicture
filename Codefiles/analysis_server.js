//Configure base framework requirements
var express = require('express');
var app = express();

const port = 8080;

//Configure BodyParser
var bodyParser = require('body-parser');
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/api/', function(req, res) {
    var user_id = req.body.id;
    var token = req.body.token;
    var content = req.body.content;
    
    /*
        I have configured the JSON Format as follows:
        
        {
            "id" : string,
            "token" : string,
            "content" : string
        }
        
        Test format is 'x-www-form-urlencoded'
    */

    
    
    res.send("Server received data successfully: " +user_id + ' ' + token + ' ' + content);
});

//Incept server
app.listen(port);

//Confirm run
console.log("Analysis Server running at http://localhost:%s", port);
 