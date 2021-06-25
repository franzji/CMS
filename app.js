var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fileUpload = require('express-fileupload');
var indexRouter = require('./routes/index');
var app = express();
var AdmZip = require('adm-zip');
var fs = require('fs');
const fsExtra = require('fs-extra');

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
        zipfile.mv("download/" + zipfile.name, function(err) {   //callback to ensure the download finishes before continuing.
          if (zipfile.name != "Default Sample File.zip"){
            fs.unlinkSync("./download/" + zipfile.name);
            apiReply(res, {
              message: 'failure! Incorrect zip file sent',
            })
            return;
          }
          //unzip the contents
          unzip(req, res);

          //validate json, escape if false
          if (validate(res) == false){
            return;
          };     
          
          //parse output
          generateJSON(res);

          //remove old data
          removeDownloads();
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

function generateJSON(res){
  let metadata = require('./extracted/metadata.json')
  let article = require('./extracted/article.json')

  let CMSoutput = {metadata:{}, element : []};
  let jsonData= {};

  //do basic metadata first
  if('ID' in metadata.MetaData.BasicMetaData){
    CMSoutput.metadata.id = metadata.MetaData.BasicMetaData.ID;
  }
  if ('Name' in metadata.MetaData.BasicMetaData){
    CMSoutput.metadata.name = metadata.MetaData.BasicMetaData.Name;
  }
  if('Type' in metadata.MetaData.BasicMetaData){
    CMSoutput.metadata.type = metadata.MetaData.BasicMetaData.Type;
  }
  if('Format' in metadata.MetaData.ContentMetaData){
    CMSoutput.metadata.format = metadata.MetaData.ContentMetaData.Format;
  }
  article.data.content.forEach(function(part){       //loop for each element in the article
    if('title' in part.content){         //select out elements
      jsonData.title = part.content.title;
      jsonData.identifier = part.identifier;      
      CMSoutput.element.push(jsonData);                //push to the end of the array
    }
    else if('text' in part.content){
      jsonData.text = part.content.text;
      jsonData.identifier = part.identifier;
      CMSoutput.element.push(jsonData);
    }
    else if('subtitle' in part.content){
      jsonData.subtitle = part.content.subtitle;
      jsonData.identifier = part.identifier;
      CMSoutput.element.push(jsonData);
    }
    else if('image' in part.content){
      jsonData.image = part.content.image;
      jsonData.identifier = part.identifier;
      CMSoutput.element.push(jsonData);
    }
    else if('html' in part.content){
      jsonData.html = part.content.html;
      jsonData.identifier = part.identifier;
      CMSoutput.element.push(jsonData);
    }
    jsonData = {};
  });
//send back result!
apiReply(res, {
  message: 'success!',
  data: CMSoutput,
});
}

// extract the archives using the unzip module to local folder
function unzip(){
	let zip = new AdmZip("download/Default Sample File.zip");
  zip.extractAllTo("./extracted/",true);
}

//easy cheat to see if the json can parse/is valid
function validate(res){
  try {
    JSON.parse(JSON.stringify(require('./extracted/article.json')));
    JSON.parse(JSON.stringify(require('./extracted/metadata.json')));
  }
  catch (err){
    apiReply(res, {
      message: 'failure! Corrupt json recieved: ' + err,
    });
    return false;
  }
  return true;
}

//reply to user
function apiReply(res, replyResponse){
  res.send(replyResponse);
}

//removes the old packages for future tests
function removeDownloads(){
  fs.unlinkSync("./download/Default Sample File.zip");
  fsExtra.emptyDirSync("./extracted");
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