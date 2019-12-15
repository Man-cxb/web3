const app = require('express')();
const server = require('http').Server(app);
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const Web3 = require('web3');
const cfg = require("./conf/conf").getCfg();

app.use(morgan('dev'));
app.use(bodyParser.json())
server.listen(80);

var web3 = new Web3(cfg["http"]);//本地节点链接

app.get('/', function (req, res) {
    console.log(process.env.NODE_ENV);
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

// 获取私钥
app.get('/GetPrivateKey', async function (req, res) {
    let address = req.query.address
    let password = req.query.password
    if (address == null || password == null) {
        res.send({ "err": "合约地址不支持！" })
        return
    }
    let check = web3.utils.isAddress(address)
    if (check == false) {
        res.send({ "err": "请输入有效的地址！" })
        return
    }
    let ok = false
    let list = fs.readdirSync('./backup')
    for (let i = 0; i < list.length; i++) {
        if (list[i] == address) {
            ok = true
            break
        }
    }
    if (ok == false) {
        res.send({ "err": "找不到对应的地址！" })
        return
    }
    let privateKey = GetPrivateKeyFromBackup(address, password)
    if (privateKey == false) {
        res.send({ "err": "请输入正确的密码！" })
    } else {
        let data = { "privateKey": privateKey }
        res.send(data)
    }
})

app.post('/importPrivateKey', function (req, res) {
    let privateKey = req.body.privateKey
    let password = req.body.password
    if (privateKey == "" || privateKey == null || password == "" || password == null) {
        res.send({ "err": "请输入正确的参数！" })
        return
    }
    let wallet
    try {
        wallet = web3.eth.accounts.privateKeyToAccount(privateKey)
    } catch (error) {
        res.send({ "err": "请输入正确的私钥！" })
        return
    }
    let backfile = web3.eth.accounts.encrypt(wallet.privateKey, password);
    const filePath = path.resolve(__dirname, 'backup/' + wallet.address);
    fs.writeFileSync(filePath, JSON.stringify(backfile));
    res.send("ok")
})

// 通过官方web3创建私钥和备份文件
app.post('/CreateAccount', function (req, res) {
    if (req.body.password == "" || req.body.password == null) {
        res.send({ "err": "请输入密码！" })
        return
    }
    let wallet = web3.eth.accounts.create();
    let backfile = web3.eth.accounts.encrypt(wallet.privateKey, req.body.password);
    let account = {
        "address": wallet['address'],            //地址
        //   "privateKey": wallet['privateKey'],   //私钥
        //   "backupFlie": backfile                //备份文件
    }
    // 只保留备份文件到本地
    const filePath = path.resolve(__dirname, 'backup/' + wallet.address);
    fs.writeFileSync(filePath, JSON.stringify(backfile));
    res.send(account)
})

// 以太坊转账
app.post('/transaction', async function (req, res) {
    let fromAddr = req.body.fromAddr    // 转账地址
    let password = req.body.password    // 转账地址的密码
    let toAddr = req.body.toAddr        // 对方地址
    let amount = req.body.amount        // 转账金额
    let token = req.body.token          // 转账代币
    if (fromAddr == null || password == null || toAddr == null || amount == null) {
        res.send({ "err": "请输入正确的参数！" })
        return
    }

    let checkFromAddr = web3.utils.isAddress(fromAddr)
    if (checkFromAddr == false) {
        res.send({ "err": "请输入有效的fromAddr！" })
        return
    }
    let checkToAddr = web3.utils.isAddress(toAddr)
    if (checkToAddr == false) {
        res.send({ "err": "请输入有效的toAddr！" })
        return
    }
    if (typeof (amount) != "number") {
        res.send({ "err": "转账金额格式为number！" })
        return
    }
    let exist = checkAddressInLocal(fromAddr)
    if (exist == false) {
        res.send({ "err": "请先导入私钥！" })
        return
    }
    let privateKey = GetPrivateKeyFromBackup(fromAddr, password)
    if (privateKey == false) {
        res.send({ "err": "请输入正确的密码！" })
    }

    console.log("发起转账：from:%s, to:%s, toke:%s, amount:%d", fromAddr, toAddr, token, amount)

    let toAmount = 0
    let tokenData = "0x00"
    if (token == null || token == "ETH") {
        toAmount = web3.utils.toWei(amount.toString(), 'ether');
    }else{
        let contractAddress = checkContractAddress(token)
        if (contractAddress == false) {
            res.send({ "err": "合约地址不支持！" })
            return
        }
        let contract = getOneERC20Token(contractAddress);
        let decimals = await contract.methods.decimals().call(); // 获取最小单位
        amount = amount * Math.pow(10, decimals);
        tokenData = contract.methods.transfer(toAddr, amount).encodeABI();
        toAddr = contractAddress
    }

    let txParms = {
        from: fromAddr,
        to: toAddr,
        data:tokenData,
        value: web3.utils.toHex(toAmount),
        chainId: cfg.chainId
    }
    // 获取指定账户地址的交易数
    let nonce = await web3.eth.getTransactionCount(fromAddr);
    txParms.nonce = nonce;

    // 获取一下预估gas
    let gas = await web3.eth.estimateGas(txParms);
    // 获取当前gasprice
    let gasPrice = await web3.eth.getGasPrice();
    txParms.gas = gas;
    txParms.gasPrice = gasPrice;

    let balance = await web3.eth.getBalance(fromAddr);
    if (balance < toAmount + gas * gasPrice) {
        res.send({ "err": "账户余额不足转账金额加手续费" })
        return
    }

    // 用密钥对账单进行签名
    let signTx = await web3.eth.accounts.signTransaction(txParms, privateKey);
    // 将签过名的账单进行发送
    web3.eth.sendSignedTransaction(signTx.rawTransaction)
        .on('transactionHash', function (hash) {
            // on 是事件机制,只有当方法调用过程中回调了transactionHash事件才会走到这里
            console.log("transactionHash:" + hash);
        })
        .on('receipt', function (receipt) {
            console.log("receipt:", receipt)
            res.send(receipt)
        })
        .on('confirmation', function (confirmationNumber, receipt) {
            console.log("收到第" + confirmationNumber + "次确认");
            if (confirmationNumber === 12) {
                console.log("完成12次确认：\n" + JSON.stringify(receipt));
                // res.send('成功')
            }
        })
        .on('error', function (error) {
            console.log(error);
        });
})

function getOneERC20Token(contractAddress) {
    let filepath = path.resolve(__dirname, './solinterface/token.json');
    let interfacestring = JSON.parse(fs.readFileSync(filepath)).interface;
    let interface = JSON.parse(interfacestring);
    let contract = new web3.eth.Contract(interface, contractAddress)
    return contract;
}

function GetPrivateKeyFromBackup(address, password) {
    let file = path.resolve(__dirname, './backup/' + address)
    const backup = fs.readFileSync(file, 'utf8');

    try {
        const account = web3.eth.accounts.decrypt(backup, password);
        return account.privateKey
    } catch (error) {
        return false
    }
}

function checkAddressInLocal(address) {
    let isok = false
    let list = fs.readdirSync('./backup')
    for (let i = 0; i < list.length; i++) {
        if (list[i] == address) {
            isok = true
            break
        }
    }
    return isok
}

function checkContractAddress(token) {
    for (const key in cfg["contractAddr"]) {
        if (key == token) {
            return cfg["contractAddr"][key]
        }
    }
    return false
}


// MonitoringCoin()
// function MonitoringCoin() {
//     var subscription = web3.eth.subscribe('pendingTransactions', function (error, result) {
//         if (!error) {
//             // console.log(web3.eth.getTransaction(result));
//             web3.eth.getTransaction(result).then(e => {
//                 console.log(e["from"] + "-->" + e["to"] + "-->" + web3.utils.fromWei(e["value"], 'ether'))
//             })
//         } else {
//             console.log(error);
//         }
//     })
//         .on("data", function (transaction) {
//             console.log("-->" + transaction);

//         });
// }
