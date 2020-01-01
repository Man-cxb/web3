const Web3 = require('web3');
const path = require('path');
const fs = require('fs');
const cfg = require("../conf/conf").getCfg();
const web3 = new Web3(cfg["http"]);
const contract = getContractObj(cfg.contractAddr.TRX)
function getContractObj(contractAddress) {
    let filepath = path.resolve(__dirname, '../solinterface/token.json');
    let interfacestring = JSON.parse(fs.readFileSync(filepath)).interface;
    let interface = JSON.parse(interfacestring);
    let contract = new web3.eth.Contract(interface, contractAddress)
    return contract;
}

signTxETH = async function(fromAddr, privateKey, toAddr, amount){
    try {
        let txParms = {
            from: fromAddr,
            to: toAddr,
            value: web3.utils.toHex(amount),
            chainId: cfg.chainId
        }
        let nonce = await web3.eth.getTransactionCount(fromAddr);
        txParms.nonce = nonce;
        let gas = await web3.eth.estimateGas(txParms);
        let gasPrice = await web3.eth.getGasPrice();
        txParms.gas = gas;
        txParms.gasPrice = gasPrice;
    
        let signTx = await web3.eth.accounts.signTransaction(txParms, privateKey);
        let cost = gas * gasPrice
        return {"code": 0, "cost": cost, "signTx": signTx}
        
    } catch (error) {
        return {"code": 500, "msg": error.message}
    }
}

signTxToken = async function(fromAddr, privateKey, toAddr, contractAddress, amount){
    try {
        let decimals = await contract.methods.decimals().call();
        let coinAmount = amount * Math.pow(10, decimals);
        let tokenData = contract.methods.transfer(toAddr, coinAmount).encodeABI();
    
        let txParms = {
            from: fromAddr,
            to: contractAddress,
            data: tokenData,
            value: "0x0",
            chainId: cfg.chainId
        }
        let nonce = await web3.eth.getTransactionCount(fromAddr);
        txParms.nonce = nonce;
        let gas = await web3.eth.estimateGas(txParms);
        let gasPrice = await web3.eth.getGasPrice();
        txParms.gas = gas;
        txParms.gasPrice = gasPrice;
        // console.log("参数：", txParms)
        let signTx = await web3.eth.accounts.signTransaction(txParms, privateKey);
        let cost = gas * gasPrice
        return {"code": 0, "cost": cost, "signTx": signTx}
    } catch (error) {
        return {"code": 500, "msg": error.message}
    }
}

transaction = function(signTx){
    web3.eth.sendSignedTransaction(signTx.rawTransaction)
    .on('transactionHash', function (hash) {

    })
    .on('receipt', function (receipt) {
        // console.log("receipt:", receipt)
        console.log("转账成功：transactionHash:%s, blockNumber:%s, from:%s, to:%s, toke:%s, amount:%d", receipt.transactionHash, receipt.blockNumber, fromAddr, toAddress, token, amount)
        let data = [receipt.blockNumber, receipt.transactionHash, fromAddr, toAddress, token, amount, des]

    })
    .on('confirmation', function (confirmationNumber, receipt) {
        // console.log("收到第" + confirmationNumber + "次确认");
        if (confirmationNumber === 12) {
            console.log("完成12次确认：\n" + JSON.stringify(receipt));
        }
    })
    .on('error', function (error) {
        console.log("转账出错：", error.message);
    });
}


exports.signTxETH = signTxETH;
exports.signTxToken = signTxToken;
exports.transaction = transaction;
