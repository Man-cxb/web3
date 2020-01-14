const Web3 = require('web3');
const cfg = require("./conf/conf").getCfg();
const db = require("./src/db")
const tool = require("./src/tool")
var redis = require("redis")
var bluebird = require("bluebird")
var redisCli = redis.createClient(cfg.redis);
bluebird.promisifyAll(redis.RedisClient.prototype);


var web3 = new Web3(cfg["ws"]);
let contractList = new Map(cfg.contractAddr)

async function subscribeToken(token) {
    if (!contractList.has(token)) {
        console.log("找不到合约地址")
        return
    }
    let contractAddress = contractList.get(token)
    let inter = tool.getTokenInterface()
    let contract = new web3.eth.Contract(inter, contractAddress)
    let decimals = await contract.methods.decimals().call();
    let mod = Math.pow(10, decimals)

    contract.events.Transfer({filter: {}}, async function(error, event){ 
        if (error) {
            console.log("订阅错误：", error)
        }else{
            let data = event.returnValues
            let to = data._to
            let txHash = event.transactionHash
            let block = event.blockNumber
            let from = data._from
            let value = parseInt(data._value) / mod
            
            let appid = await tool.getAppidByAddress(to)
            if (!appid) {
                return
            }
            console.log("有转入代币：appid:%s, tx:%s, block:%s, form:%s, to:%s, value:%s", appid, txHash, block, from, to, value);

            // 数据入库
            db.dbmgr("t_recharge", "save", [appid, txHash, from, to, token, value, Date.now(), ""])

            // 保存到redis, 后端查询后删除
            redisCli.hset(to, txHash, value)

            // 通知后端
            let msg = {"address": to, "appid": appid, "txHash": txHash, "token": token}
            let res = await tool.sendHttp(appid, cfg.rechargePath, msg, "game", "充值到账")
            if (res.code != 0) {
                // 通知后端失败时，保存数据，定时再请求
                // redisCli.hset("resend", txHash, msg)
                console.log("区块链收到充值，但通知后端出错了~~", res)
            }
        }
    })
    .on('data', function(event){
        // console.log("--1>", event);
    })
    .on('changed', function(event){
        // console.log("--2>", event);
        
    })
    .on('error', function(error){
        console.log("订阅发生错误：", error)
    });
}

function subscribeETH(){
    web3.eth.subscribe('newBlockHeaders', function(error, result){
        if (error){
            console.log(error);
        }else{
            console.log("以太坊区块高度：", result.number)
        }
    })
}

start()
function start(){
    cfg.contractAddr.forEach(element => {
        let token = element[0]
        console.log("开始订阅合约：%s", token)
        subscribeToken(token)
    });

    console.log("开始订阅以太坊")
    subscribeETH()

    // 定时器
    setInterval(resendToGame, 600 * 1000); // 时间单位毫秒, 间隔10分钟
}

async function resendToGame() {
    let arr = await redisCli.hgetallAsync("resend")
    console.log("需要重新通知后端列表：", arr)

    for (const key in arr) {
        let data = arr[key]
        let res = await tool.sendHttp(data.appid, cfg.rechargePath, data, "game", "充值到账")
        if (res != "success") {
            // 通知后端失败时，保存数据，定时再请求
            redisCli.hset("resend", key, data)
        }else{
            // 通知成功，移除记录
            redisCli.hdel("resend", key)
        }
    }
}