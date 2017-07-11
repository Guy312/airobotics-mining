
var express = require('express');               // main express package
var path = require('path');                     // @todo: remove unused ?
var cookieParser = require('cookie-parser');    // used for session cookie
var bodyParser = require('body-parser');        // ?
var session = require('express-session');       // @todo: simple in-memory session is used here. use connect-redis for production!!
var proxy = require('./routes/proxy');          // used when requesting data from real services.
var index = require('./routes/index');          // @todo: remove unused ?
var config = require('./predix-config');        // @todo: remove unused ? get config settings from local file or VCAPS env var in the cloud
var passport;                                   // only used if you have configured properties for UAA
var passportConfig = require('./passport-config');// configure passport for oauth authentication with UAA

// ---------------------------------------------------------------------------------------------------------------------

// if running locally, we need to set up the proxy from local config file:
var node_env = process.env.node_env || 'development';
if (node_env === 'development') {
    var devConfig = require('./localConfig.json')[node_env];
    proxy.setServiceConfig(config.buildVcapObjectFromLocalConfig(devConfig));
    proxy.setUaaConfig(devConfig);
}

//a back-end java microservice used in the Build A Basic App learningpath
//var windServiceURL = devConfig ? devConfig.windServiceURL : process.env.windServiceURL;

console.log('************' + node_env + '******************');

if (config.isUaaConfigured()) {
    console.log('UAA is Configured');
    passport = passportConfig.configurePassportStrategy(config);
}

//turns on or off text or links depending on which tutorial you are in, guides you to the next tutorial
var learningpaths = require('./learningpaths/learningpaths.js');

// ---------------------------------------------------------------------------------------------------------------------
// SETTING UP EXRESS SERVER
// ---------------------------------------------------------------------------------------------------------------------

 var app = express();

app.set('trust proxy', 1);
app.use(cookieParser('predixsample'));
// Initializing default session store
// *** Use this in-memory session store for development only. Use redis for prod. **
app.use(session({
    secret: 'predixsample',
    name: 'cookie_name',
    proxy: true,
    resave: true,
    saveUninitialized: true
}));

if (config.isUaaConfigured()) {
    app.use(passport.initialize());
    // Also use passport.session() middleware, to support persistent login sessions (recommended).
    app.use(passport.session());
}

//Initializing application modules
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

var server = app.listen(process.env.VCAP_APP_PORT || 5000, function () {
    console.log('Server started on port: ' + server.address().port);
});

// ---------------------------------------------------------------------------------------------------------------------
// SET UP EXPRESS ROUTES
// ---------------------------------------------------------------------------------------------------------------------

// @todo: remove that:
// //route to retrieve learningpath info which drives what is displayed
// app.get('/learning-paths', function (req, res) {
//     //console.log(learningpaths);
//     res.json({"learningPathsConfig": learningpaths.getLearningPaths(config)});
// });

// allows access to resources in public folder
app.use(express.static(path.join(__dirname, process.env['base-dir'] ? process.env['base-dir'] : '../public')));


if (config.isUaaConfigured()) {
    //Use this route to make the entire app secure.  This forces login for any path in the entire app.
    app.use('/', index);

    //login route redirect to predix uaa login page
    app.get('/login', passport.authenticate('predix', {'scope': ''}), function (req, res) {
        // The request will be redirected to Predix for authentication, so this
        // function will not be called.
    });

    // @todo: remove that, only UAA service in use
    // access real Predix services using this route.
    // the proxy will add UAA token and Predix Zone ID.
    // app.use('/predix-api',
    //     passport.authenticate('main', {
    //         noredirect: true
    //     }),
    //     proxy.router);

    //callback route redirects to secure route after login
    app.get('/callback', passport.authenticate('predix', {
        failureRedirect: '/'
    }), function (req, res) {
        console.log('Redirecting to secure route...');
        res.redirect('/secure');
    });

    // @todo: remove that, only UAA service in use
    // example of calling a custom microservice.
    // if (windServiceURL && windServiceURL.indexOf('https') === 0) {
    //     app.get('/api/services/windservices/*', passport.authenticate('main', {noredirect: true}),
    //         // if calling a secure microservice, you can use this middleware to add a client token.
    //         // proxy.addClientTokenMiddleware,
    //         proxy.customProxyMiddleware('/api', windServiceURL)
    //     );
    // }

    /**
     ** // @todo: remove that, only UAA service in use
     ** this endpoint is required by Timeseries.js, for winddata is switch
     **/
    // app.get('/config-details', passport.authenticate('main', {
    //     noredirect: true //Don't redirect a user to the authentication page, just show an error
    // }), function (req, res) {
    //     console.log('Accessing the secure route data');
    //     res.setHeader('Content-Type', 'application/json');
    //     var configuration = {};
    //     if (!windServiceURL) {
    //         configuration.connectToTimeseries = "true";
    //     }
    //     if (config.assetURL && config.assetZoneId) {
    //         configuration.isConnectedAssetEnabled = "true";
    //     }
    //     res.send(JSON.stringify(configuration));
    //
    // });

    //Or you can follow this pattern to create secure routes,
    // if only some portions of the app are secure.
    app.get('/secure', passport.authenticate('main', {
        noredirect: true //Don't redirect a user to the authentication page, just show an error
    }), function (req, res) {
        console.log('Accessing the secure route');
        // modify this to send a secure.html file if desired.
        res.sendFile(path.join(__dirname + '/../secure/secure.html'));
        //res.send('<h2>This is a sample secure route.</h2>');
    });

    app.get('/secure/home', passport.authenticate('main', {
        noredirect: true //Don't redirect a user to the authentication page, just show an error
    }), function (req, res) {
        console.log('Accessing the secure route');
        res.sendFile(path.join(__dirname + '/../secure/home.html'));
    });

    var db = require('./queries');
    app.get('/api/piles', passport.authenticate('main', { noredirect: true}),db.getAllPiles);
    app.get('/api/pile/:id', passport.authenticate('main', { noredirect: true}), db.getSinglePile);
    app.get('/api/pileImage/:pileID', passport.authenticate('main', { noredirect: true}), db.getPileImage);

}

//logout route
app.get('/logout', function (req, res) {
    req.session.destroy();
    req.logout();
    passportConfig.reset(); //reset auth tokens
    res.redirect(config.uaaURL + '/logout?redirect=' + config.appURL);
});

app.get('/favicon.ico', function (req, res) {
    res.send('favicon.ico');
});

// ---------------------------------------------------------------------------------------------------------------------
// error handlers
// ---------------------------------------------------------------------------------------------------------------------

// catch 404 and forward to error handler
app.use(function (err, req, res, next) {
    console.error(err.stack);
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// development error handler - prints stacktrace
if (node_env === 'development') {
    app.use(function (err, req, res, next) {
        if (!res.headersSent) {
            res.status(err.status || 500);
            res.send({
                message: err.message,
                error: err
            });
        }
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    if (!res.headersSent) {
        res.status(err.status || 500);
        res.send({
            message: err.message,
            error: {}
        });
    }
});

module.exports = app;
