const Web3 = require('web3');
const cfg = require("./conf/conf").getCfg();
const path = require('path');
const fs = require('fs');
const Tx = require("./src/Tx")
const db = require("./src/db")
const tool = require("./src/tool")

var web3 = new Web3(cfg["ws"]);
let addressList = new Map();
let contractList = new Map(cfg.contractAddr)

db.query("t_account", null, function(res){
    if (res.code != 0) {
        console.log(res.msg)
    }else{
        for (let i = 0; i < res.msg.length; i++) {
            const data = res.msg[i];
            const backup = tool.bufferToJson(data.backup)
            addressList.set(data.address, backup)
        }
    } 
})

subscribe("TRX")
async function subscribe(token) {
    if (contractList.has(token)) {
        console.log("找不到合约地址")
        return
    }
    let contractAddress = contractList.get(token)
    let inter = tool.getTokenInterface()
    let contract = new web3.eth.Contract(inter, contractAddress)
    let decimals = await contract.methods.decimals().call();
    let mod = Math.pow(10, decimals)
    contract.events.Transfer({filter: {}}, async function(error, event){ 
        // console.log("--0>", event); 
        if (!error) {
            console.log("订阅错误：", error)
        }else{
            let data = event.returnValues
            let txHash = event.transactionHash
            let block = event.blockNumber
            let from = data._from
            let to = data._to
            let value = parseInt(data._value) / mod

            if (addressList.has(to)) {
                //检测到有代币转入指定的地址
                console.log("有转入代币： tx:%s, block:%s, form:%s, to:%s, value:%s", txHash, block, from, to, value);
                //转出代币签名(从to转到汇总钱包)
                let toBackup = addressList.get(to)
                let password = tool.getPassword(to)
                let account = web3.eth.accounts.decrypt(toBackup, password);
                let privateKey = account.privateKey
                let signTxTokenCb = await Tx.signTxToken(to, privateKey, cfg.coldWallet, contractAddress, value)
                console.log("转出代币签名：", signTxTokenCb)
                if (signTxTokenCb.code != 0) {
                    console.log("签名Token失败：", signTxTokenCb)
                    return
                }
                let costGas = signTxTokenCb.cost * 1.1 // 转出Token所需手续费

                //转出手续费签名(从热钱包转出手续费)
                let fromHot = cfg.hotWallet
                let fromHotPriKey = tool.getPassword(fromHot)
                let signTxEthCb = await Tx.signTxETH(fromHot, fromHotPriKey, to, costGas)
                console.log("转出手续费签名: ", signTxEthCb)
                if (signTxEthCb.code != 0) {
                    console.log("签名ETH失败：", signTxEthCb)
                    return
                }

                //转出手续费
                // Tx.transaction(signTxEthCb.signTx)

                //转出代币

            }
        }
    })
    .on('data', function(event){
        // console.log("--1>", event);
    })
    .on('changed', function(event){
        // console.log("--2>", event);
        
    })
    .on('error', console.error);
}
