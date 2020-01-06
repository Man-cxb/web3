const http = require('http');
const tool = require("./tool")
module.exports ={
  POST:(appid, path, data)=>{
    let post_date = new Promise(function(resolve, reject){
        let cfg = tool.getGameCfg(appid)
        if (!cfg) {
            reject("缺少配置")
        }
        let content = JSON.stringify(data);
        let options = {
          host: cfg.gameHost,
          port: cfg.gamePort,
          path: path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': content.length
          }
        };
        
        var req = http.request(options, function (res) {
          res.setEncoding('utf-8');
          var responseString = '';
        
          res.on('data', function (data) {
            responseString += data;
          });
        
          res.on('end', function () {
            var resultObject = JSON.parse(responseString);
            resolve(resultObject);
            // console.log(resultObject);
          });
        
          res.on('error', function (e) {
            // console.log('error:', e);
            reject(e)
          });
        });
        
        req.write(content);
        req.end();
      })
      return post_date
  }
}