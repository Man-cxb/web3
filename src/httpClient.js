const http = require('http');
const tool = require("./tool")
module.exports ={
  POST:(appid, path, data, target)=>{
    let post_date = new Promise(function(resolve, reject){
        let cfg = tool.getGameCfg(appid)
        if (!cfg) {
            reject("缺少配置")
        }

        let mHost = cfg.gameHost;
        let mPort = cfg.gamePort;
        if (target == "console") {
          mHost = cfg.consoleHost;
          mPort = cfg.consolePort;
        }

        let content = JSON.stringify(data);
        let options = {
          host: mHost,
          port: mPort,
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
          });
        
          res.on('error', function (e) {
            reject(e)
          });
        });
        
        req.write(content);
        req.end();
      })
      return post_date
  }
}