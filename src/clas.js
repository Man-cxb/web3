const Web3 = require('web3');
const path = require('path');
const fs = require('fs');
const cfg = require("../conf/conf").getCfg();
const web3 = new Web3(cfg["http"]);

class Tx {
    constructor(txHash, blockNum, from, to, amount, token) {
        this.txHash = txHash;
        this.blockNum = blockNum;
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.token = token;
    }

    async singnETH(){
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

    transaction(){

    }
}

function getContractObj(contractAddress) {
    let filepath = path.resolve(__dirname, '../solinterface/token.json');
    let interfacestring = JSON.parse(fs.readFileSync(filepath)).interface;
    let interface = JSON.parse(interfacestring);
    let contract = new web3.eth.Contract(interface, contractAddress)
    return contract;
}
module.exports = Tx;