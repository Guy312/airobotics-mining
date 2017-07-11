var express = require('express');
var router = express.Router();

/* GET index page. */

// router.use(function(req,res,next){
//   console.log('index.html from router - index.js');
//   //res.redirect('/login?state=secure');
//   next();
// });

router.get('/', function(req, res, next) {
    //console.log('Its me');
    res.redirect('/login?state=secure');
    //res.sendFile('index.html');
});



module.exports = router;
