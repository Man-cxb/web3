const path = require('path');
const fs = require('fs');
const cfg = require("../conf/conf").getCfg();
const request = require('request-promise');
const redis = require("redis")
const bluebird = require("bluebird")
const redisCli = redis.createClient(cfg.redis);
bluebird.promisifyAll(redis.RedisClient.prototype);

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
    let str = address.substr(address.length - 6, address.length);
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

// 获取地址所属的appid
async function getAppidByAddress(address) {
    let id = ""
    for (let index = 0; index < cfg.appList.length; index++) {
        let appid = cfg.appList[index].id
        let ok = await redisCli.hexistsAsync(appid, address)
        if (ok == 1) {
            id = appid
            break
        }
    }
    if (id == "") {
        return false
    }
    return id
}

// 获取后端地址
function getGameCfg(appid) {
    let appList = cfg.appList
    for (let i = 0; i < appList.length; i++) {
        if (appList[i].id == appid) { 
            let msg = {
                isOpenWithdraw: appList[i].isOpenWithdraw, 
                gameHost: appList[i].gameHost, 
                gamePort: appList[i].gamePort, 
                consoleHost: appList[i].consoleHost, 
                consolePort: appList[i].consolePort,
                subscribes: appList[i].subscribes
            }
            return msg
        }
    }
    return null
}

// 发送http
function sendHttp(appid, path, data, target, reason){
    let send = new Promise(function(resolve, reject){ 
        let cfg = getGameCfg(appid)
        if (!cfg) {
            reject("缺少配置")
        }

        let mHost = cfg.gameHost;
        let mPort = cfg.gamePort;
        if (target == "console") {
          mHost = cfg.consoleHost;
          mPort = cfg.consolePort;
        }
        let options = {
            method: 'POST',
            uri: 'http://' + mHost + ':' + mPort + path,
            body: data,
            json: true
        };

        request(options)
            .then(function (msg) {
                console.log("http请求：appid:%s, path:%s, data:%s, target:%s, reason:%s, msg:%s", appid, path, data, target, reason, msg)
                if (msg.code == 0) {
                    resolve({"code": 0})
                }else{
                    resolve(msg)
                }
            })
            .catch(function (error) {
                console.error("http请求出错：appid:%s, path:%s, data:%s, target:%s, reason:%s, error:%s", appid, path, data, target, reason, error.message)
                reject({"code": 404, "msg": error.message})
            });
    })
    return send
}

exports.getTokenInterface = getTokenInterface
exports.bufferToJson = bufferToJson
exports.getPassword = getPassword
exports.getAdminAddress = getAdminAddress
exports.checkAppid = checkAppid
exports.getGameCfg = getGameCfg
exports.sendHttp = sendHttp
exports.getAppidByAddress = getAppidByAddress