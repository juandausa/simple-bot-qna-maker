var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');
var bunyan = require('bunyan');
var log = bunyan.createLogger({
    name: 'simple-bot',
    streams: [{
            level: 'error',
            stream: process.stdout
        },
        {
            level: 'info',
            path: './logs/simple-bot-info.log'
        }
    ],
    serializers: bunyan.stdSerializers
});
var config = require("./config/credentials.json");
log.info("Bot URL: " + config.url);

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function() {
    log.info('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
var bot = new builder.UniversalBot(connector, function(session) {
    log.info("Incoming request: " + session.message.text);
    request.post({
            url: config.url,
            form: {
                'question': session.message.text
            },
            headers: {
                'Ocp-Apim-Subscription-Key': config.key,
                'Content-Type': 'application/json'
            },
        },
        function(error, response, body) {
            log.info("Incoming response: { Status: " + request.statusCode + ", body: " + body);
            if (!error && response.statusCode == 200) {
                var answer = JSON.parse(body);

                if (answer["answers"]) {
                    if (answer["answers"][0]["answer"]) {
                        session.send(answer["answers"][0]["answer"]);
                    } else {
                        session.send("No pudimos entender tu pregunta ¿podrías reformularla?");
                        log.warn("No pudimos entender tu pregunta ¿podrías reformularla?" + answer);
                    }
                } else {
                    log.warn("No pudimos entender tu pregunta ¿podrías reformularla?" + answer);
                }
            } else {
                log.error('Se produjo un error al realizar la consulta.' + body);
                session.send('Se produjo un error al realizar la consulta.');
            }
        }
    );
});