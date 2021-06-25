var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fileUpload = require('express-fileupload');
var indexRouter = require('./routes/index');
var app = express();
var AdmZip = require('adm-zip');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//file upload
app.use(fileUpload({
    createParentPath: true
  }));

//main api call
app.post('/uploadzip', async (req, res) => {
  try {
      if(req.files) {
        let zipfile = req.files.zipfile;
        zipfile.mv(zipfile.name, function(err) {   //callback to ensure the download finishes before continuing.
          if (err) return res.status(500).json(err);

          //unzip the contents
          unzip(req, res);

          
          //parse output

          apiReply(res, {
            message: 'success!',
          })
        });
      } else {
        apiReply(res, {
          message: 'failure! No zipfile sent',
        });
      }
  } catch (err) {
    apiReply(res, {
      message: 'failure!' + err,
    });
  }
});

function unzip(){
	// extract the archives using the unzip module to local folder
	let zip = new AdmZip("Default Sample File.zip");
  zip.extractAllTo("./extracted/",true);
}


function apiReply(res, replyResponse){
  res.send(replyResponse);
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;