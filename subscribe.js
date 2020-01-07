const Web3 = require('web3');
const cfg = require("./conf/conf").getCfg();
// const path = require('path');
// const fs = require('fs');
// const Tx = require("./src/Tx")
const db = require("./src/db")
const tool = require("./src/tool")
const httpCli = require("./src/httpClient")

var redis = require("redis")
var bluebird = require("bluebird")
var redisCli = redis.createClient(cfg.redis);
bluebird.promisifyAll(redis.RedisClient.prototype);


var web3 = new Web3(cfg["ws"]);
let contractList = new Map(cfg.contractAddr)
let addressList = {}


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
            let appid = ""
            for (let index = 0; index < cfg.appList.length; index++) {
                console.log(cfg.appList[index])
                let id = cfg.appList[index].id
                let ok = await redisCli.hexistsAsync(id, to)
                if (ok == 1) {
                    appid = id
                }
            }
            if (appid == "") {
                return
            }

            let txHash = event.transactionHash
            let block = event.blockNumber
            let from = data._from
            
            let value = parseInt(data._value) / mod
            console.log("有转入代币： tx:%s, block:%s, form:%s, to:%s, value:%s", txHash, block, from, to, value);

            // 数据入库

            // 保存到redis
            redisCli.hset(to, txHash, value)

            // 通知后端
            let data = {"address": to, "appid": appid, "txHash": txHash}
            httpCli.POST(appid, cfg.rechargePath, data)
            .then((msg, error)=>{
                if (error) {
                    console.log("收到充值，通知后端%s接口出错, data:%s, err:%s", cfg.rechargePath, data, error)
                }else{
                    if (msg.code != 0) {
                        console.log("收到充值，通知后端返回错误, data:%s, msg:%s", data, msg)
                    }else{
                        console.log("收到充值，成功通知后端, data:%s", data)
                    }
                }
            })
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
        }
        console.log("--res-->", result)
    })
    // .on("data", function(blockHeader){
    //     console.log("-s->", blockHeader)
    // });
}

function addAddress(addr){
    if (addr != null) {
        addressList[addr] = true
    }
}

function checkAddress(addr){
    if (addr == null) {
        return false
    }
    if (!addressList[addr]) {
        return false
    }
    return true
}

let token = "TRX"
start()
function start(){
    console.log("开始订阅合约：%s", token)
    subscribeToken(token)
    // console.log("开始订阅以太坊")
    // subscribeETH()
}