var AdmZip = require('adm-zip');
var download = require('download-file');
var fs = require("fs");

var file = "Razorpay.framework-0.15.0.zip";
var url = "http://downloads.razorpay.com/" + file;

download(url, {}, function(err){
    if (err) throw err;
    var zip = new AdmZip(file);
    zip.extractAllTo("ios", true);
    fs.unlinkSync(file);
}); 