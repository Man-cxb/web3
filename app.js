const app = require('express')();
const server = require('http').Server(app);
const morgan = require('morgan');
const bodyParser = require('body-parser');

app.use(morgan('dev'));
app.use(bodyParser.json())
server.listen(80);

const Web3 = require('web3');
const cfg = require("./comm/conf");
var web3 = new Web3(cfg["websockIp"]);//本地节点链接
const bip39 = require('bip39');
const hdkey = require('ethereumjs-wallet/hdkey');
const util = require('ethereumjs-util');
const path = require('path');
const fs = require('fs');

app.get('/', function (req, res) {
    res.send({ "state": "ok!" });
});

//获取以太坊主链代币数量
app.get('/GetEthBalance', async function (req, res) {
    if (req.query.address == "" || req.query.address == null) {
        res.send({ "err": "请输入要查询的地址！" })
        return
    }
    // console.log(req.query.address)
    let check = web3.utils.isAddress(req.query.address)
    console.log(check)
    if (check == false) {
        res.send({ "err": "请输入有效的地址！" })
        return
    }
    let eth = await web3.eth.getBalance(req.query.address);
    let balance = web3.utils.fromWei(eth, 'ether')
    res.send(balance)
})
  
//获取合约代币资产
app.get('/GetTokenBalance', async function (req, res) {
    let check = web3.utils.isAddress(req.query.address)
    if (check == false) {
        res.send({ "err": "请输入有效的地址！" })
        return
    }
    let contractAddress = ""
    for (const key in cfg["contractAddr"]) {
        if (key == req.query.token) {
            contractAddress = cfg["contractAddr"][key]
        } 
    }
    if (contractAddress == "") {
        res.send({ "err": "合约地址不支持！" })
        return
    }
    let contract = getOneERC20Token(contractAddress);
    let symbol = await contract.methods.symbol().call();
    let balance = await contract.methods.balanceOf(req.query.address).call();
    let token = {}
    token.symbol = symbol;
    token.balance = balance;
    res.send(token)
})

// 通过bip39创建助记词账户
app.post('/CreateMnemonic', function (req, res) {
    let mnemonic = bip39.generateMnemonic();
    let address = mnemonicToAddress(mnemonic)
    let account = {
        mnemonic : mnemonic,
        address : address
    }
    res.send(account)
})

// 通过官方web3创建私钥和备份文件
app.post('/CreateAccount', function (req, res) {
    if (req.body.password == "" || req.body.password == null) {
      res.send({ "err": "请输入密码！" })
    }
    let wallet = web3.eth.accounts.create();
    let backfile = web3.eth.accounts.encrypt(wallet.privateKey, req.body.password);
    let account = {
      "address": wallet['address'],         //地址
      "privateKey": wallet['privateKey'],   //私钥
      "backupFlie": backfile                //备份文件
    }
    res.send(account)
})

// 通过私钥转账
app.post('/transactionEth', function (req, res) {
    let mnemonic = req.body.mnemonic    //助记词
    let toAddr = req.body.toAddr        // 对方地址
    let amount = req.body.amount        // 转账金额
    if (mnemonic == null || toAddr == null || amount == null) {
        res.send({ "err": "请输入正确的参数！" })
        return
    }

    let addrss = mnemonicToAddress(mnemonic)
    let check1 = web3.utils.isAddress(addrss)
    if (check1 == false) {
        res.send({ "err": "请输入有效的密钥！" })
        return
    }
    let check2 = web3.utils.isAddress(addrss)
    if (check2 == false) {
        res.send({ "err": "请输入有效的toAddr！" })
        return
    }
    let parType = typeof amount
    if (parType !== Number) {
        res.send({ "err": "转账金额格式为number！" })
        return
    }
    let eth = await web3.eth.getBalance(address);
    let balance = web3.utils.fromWei(eth, 'ether')
    


    // let rawTx = {
    //     "from": formAddress,
    //     "nonce": web3.utils.toHex(nonce),
    //     "gasPrice": web3.utils.toHex(gasPrice),
    //     "gasLimit": web3.utils.toHex(gas),
    //     "to": toAddress,
    //     "value": web3.utils.toHex(value), // ether value, usually 0
    //     "data": "0x00",
    //     "chainId": 0x03  // mainnet chain
    // };
    let formAddress = '0xb5e3E5D51fCa7150357a46cFD3Dfd303e8f14638';//转账方地址
    let formPrivactkey = '5eb2b5cc620260b2f4e126db24adcceb6263d77dacbf528a72d576adad33344b';//转账方私钥
    let toAddress = '0x00CCDD96d2B8e55AbEBFeEB6CAC523edBc859aEB';//接收方地址
    let value = web3.utils.toWei("0.1", 'ether');
    // let value = parseInt(value1);
    let txParms = {
        from: formAddress,
        to: toAddress,
        data: web3.utils.toHex('哈'), // 当使用代币转账或者合约调用时
        value: web3.utils.toHex(value), // value 是转账金额
        chainId: 3
    }
    // 获取一下预估gas
    let gas = await web3.eth.estimateGas(txParms);
    // 获取当前gasprice
    let gasPrice = await web3.eth.getGasPrice();
    // 获取指定账户地址的交易数
    let nonce = await web3.eth.getTransactionCount(formAddress);
    txParms.gas = gas;
    txParms.gasPrice = gasPrice;
    // console.log(gas + ':' + gasPrice);
    txParms.nonce = nonce;
    // 用密钥对账单进行签名
    let signTx = await web3.eth.accounts.signTransaction(txParms, formPrivactkey);
    // 将签过名的账单进行发送
    web3.eth.sendSignedTransaction(signTx.rawTransaction)
        .on('transactionHash', function (hash) {
            // on 是事件机制,只有当方法调用过程中回调了transactionHash事件才会走到这里
            console.log("hash success:" + hash);
        })
        .on('receipt', function (receipt) {
            // console.log("")
        })
        .on('confirmation', function (confirmationNumber, receipt) {
            console.log("收到第" + confirmationNumber + "次确认");
            if (confirmationNumber === 12) {
                console.log("完成12次确认：\n" + JSON.stringify(receipt));
                //callback(null, receipt);
            }
        })
        .on('error', function (error) {
            console.log(error);
            //callback(error);
        });
})

function getOneERC20Token(contractAddress) {
    let filepath = path.resolve(__dirname, './solinterface/token.json');
    let interfacestring = JSON.parse(fs.readFileSync(filepath)).interface;
    let interface = JSON.parse(interfacestring);
    let contract = new web3.eth.Contract(interface, contractAddress)
    return contract;
}

function mnemonicToAddress(mnemonic) {
    let seed = bip39.mnemonicToSeedSync(mnemonic)
    let hdWallet = hdkey.fromMasterSeed(seed)
    let key1 = hdWallet.derivePath("m/44'/60'/0'/0/0")
    let address1 = util.pubToAddress(key1._hdkey._publicKey, true)
    address1 = util.toChecksumAddress(address1.toString('hex'))
    return address1
}

/**
 * 代币转账
 async function coinTransaction() {
    let fromAddress = "0xb5e3E5D51fCa7150357a46cFD3Dfd303e8f14638"; // 转币方
    let toAddress = "0xf17f52151EbEF6C7334FAD080c5704D77216b732"; // 接收方
    let fromKey = "0x5eb2b5cc620260b2f4e126db24adcceb6263d77dacbf528a72d576adad33344b"; // 转币方私钥
    let contractAddress = "0xb37867855b769834dc6e44f86325b046d668541f"; // 代币合约地址
    let count = 100;//转账数量
    // 代币转账 相比较 ether 转账而言,就是 不传value 传data(data:智能合约方法的16机制字符串)
    // to : 代币交易接收方是代币地址
    // 1. 拿到智能合约实例
    let contract = getOneERC20Token(contractAddress);
    // 2. 合约转账方法 编码 => "0xsafsad" 的16机制字符串
    // 获取代币最小单位
    let decimals = await contract.methods.decimals().call(); // 6
    let value = count * Math.pow(10, decimals);
    // console.log("value:" + value);
    let cdata = contract.methods.transfer(toAddress, count).encodeABI();
    // 3. 构建账单
    let tx = {
        from: fromAddress,
        to: contractAddress,
        data: cdata,
        value: '0x00',
        chainId: 3
    }
    // gas gasprice nonce
    tx.gas = await web3.eth.estimateGas(tx);
    tx.gasPrice = await web3.eth.getGasPrice();
    tx.nonce = await web3.eth.getTransactionCount(fromAddress);
    // 4. 签名账单
    let signTX = await web3.eth.accounts.signTransaction(tx, fromKey);
    // 5. 发送账单
    web3.eth.sendSignedTransaction(signTX.rawTransaction)
        .on('transactionHash', function (hash) {
            // on 是事件机制,只有当方法调用过程中回调了transactionHash事件才会走到这里
            console.log("hash success:" + hash);
        })
        .on('receipt', function (receipt) {
            //console.log(JSON.stringify(receipt));
        })
        .on('confirmation', function (confirmationNumber, receipt) {
            //console.log("收到第" + confirmationNumber + "次确认");
            if (confirmationNumber === 12) {
                console.log("完成12次确认：\n" + JSON.stringify(receipt));
            }
        })
        .on('error', function (error) {
            console.log(error);
        });
}
 
function MonitoringCoin() {
    var subscription = web3.eth.subscribe('pendingTransactions', function (error, result) {
        if (!error) {
            // console.log(web3.eth.getTransaction(result));
            web3.eth.getTransaction(result).then(e => {
                console.log(e["from"] + "-->" + e["to"] + "-->" + web3.utils.fromWei(e["value"], 'ether'))
            })
        } else {
            console.log(error);
        }
    })
        .on("data", function (transaction) {
            console.log("-->" + transaction);

        });
}

 */