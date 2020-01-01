const path = require('path');
const fs = require('fs');
const cfg = require("../conf/conf").getCfg();

function getTokenInterface(){
    let filepath = path.resolve(__dirname, './token.json');
    let buff = fs.readFileSync(filepath)
    let interfacestring = JSON.parse(buff).interface;
    let tokenInterface = JSON.parse(interfacestring);
    return tokenInterface
}

function bufferToJson(buff){
    let jsstr = JSON.stringify(buff);
    let jsondata = JSON.parse(jsstr);
    let datastr = Buffer.from(jsondata).toString();
    let data = JSON.parse(datastr);
    return data
}

// 获取密码，目前为配置密码 拼接 地址后6位，可根据需要修改
function getPassword(address){
    var str = address.substr(address.length - 6, address.length);
    return cfg.accountPassword + str
}

exports.getTokenInterface = getTokenInterface
exports.bufferToJson = bufferToJson
exports.getPassword = getPassword