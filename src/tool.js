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

// 获取管理员账户
function getAdminAddress(appid) {
    let appList = cfg.appList
    for (let i = 0; i < appList.length; i++) {
        if (appList[i].id == appid) {
            return appList[i].admin
        }
    }
    return null
}

// 检测appid是否支持
function checkAppid(appid) {
    let appList = cfg.appList
    for (let i = 0; i < appList.length; i++) {
        if (appList[i].id == appid) {
            return true
        }
    }
    return false
}

// 获取后端地址
function getGameCfg(appid){
    let appList = cfg.appList
    for (let i = 0; i < appList.length; i++) {
        if (appList[i].id == appid) { 
            return {host: appList[i].gameHost, port: appList[i].gamePort}
        }
    }
    return null
}

exports.getTokenInterface = getTokenInterface
exports.bufferToJson = bufferToJson
exports.getPassword = getPassword
exports.getAdminAddress = getAdminAddress
exports.checkAppid = checkAppid
exports.getGameCfg = getGameCfg