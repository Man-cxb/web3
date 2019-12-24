const app = require('express')();
const server = require('http').Server(app);
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const Web3 = require('web3');
const cfg = require("./conf/conf").getCfg();
const sqlhelper = require('./sqlhelper')
app.use(morgan('dev'));
app.use(bodyParser.json())

// http监听80端口
server.listen(80);

app.use('*',(req, res, next) => {
    var ip = req.headers['x-real-ip'] ? req.headers['x-real-ip'] : req.ip.replace(/::ffff:/, '');
    for (const key in cfg.whitelist) {
        if (key == ip) {
            console.log("来自%s，ip：%s的请求，url：", cfg.whitelist[key], req.host, req.baseUrl)
            next()
            return
        }
    }
    console.log("无效请求：ip:%s, url:%s", ip, req.baseUrl)
    res.send({err: "无效的请求"})
})

// 创建web3链接
const web3 = new Web3(cfg["http"]);

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
    let decimals = await contract.methods.decimals().call(); // 获取最小单位
    let token = {}
    token.symbol = symbol;
    token.balance = balance / Math.pow(10, decimals);
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

    sqlhelper.query_objc("query", "t_account", [address],(error, callback)=>{
        if(error){
            console.log("查询数据库出错：",error)
            res.send({ "err": "查询数据库出错" });
            return
        }
        if (callback[0] == null) {
            res.send({ "err": "找不到私钥！" });
            return
        }
        let backup = bufferToJson(callback[0].backup)
        try {
            let account = web3.eth.accounts.decrypt(backup, password);
            res.send({ "privateKey": account.privateKey });
            return 
        } catch (error) {
            res.send({ "err": "请输入正确的密码！" });
            return false
        }
    })
})

// 导入私钥
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
    let time = Date.now()
    sqlhelper.query_objc("save", "t_account", [wallet.address, JSON.stringify(backfile), time, "user input"],(error, callback)=>{
        if(error){
            console.log(error)
            res.send({ "err": "存储数据库出错" })
            return
        }
        res.send("ok")
    })
})

// 通过官方web3创建私钥和备份文件
app.get('/CreateAccount', function (req, res) {
    let wallet = web3.eth.accounts.create();
    let password = getPassword(wallet.address)
    console.log("创建账户：address:%s, pwd:%s",wallet.address, password)
    let backfile = web3.eth.accounts.encrypt(wallet.privateKey, password);
    let time = Date.now()
    sqlhelper.query_objc("save", "t_account", [wallet.address, JSON.stringify(backfile), time, "system create"],(error, callback)=>{
        if(error){
            console.log(error)
            res.send({ "err": "存储数据库出错" })
            return
        }
    })
    res.send({"address": wallet.address})
})

// 以太坊转账
app.post('/transaction', function (req, res) {
    let user = req.body.user
    if (user != cfg.user) {
        res.send({ "err": "权限不足" })
        return
    }
    let fromAddr = req.body.fromAddr    // 转账地址
    let toAddr = req.body.toAddr        // 对方地址
    let amount = req.body.amount        // 转账金额
    let token = req.body.token          // 转账代币
    if (fromAddr == null || toAddr == null || amount == null) {
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

    sqlhelper.query_objc("query", "t_account", [fromAddr], async (error, callback)=>{
        if(error){
            console.log("查询数据库出错：",error)
            res.send({ "err": "查询数据库出错" });
            return
        }
        if (callback[0] == null) {
            res.send({ "err": "请先导入私钥！" });
            return
        }
        let backup = bufferToJson(callback[0].backup)
        let privateKey = ""
        let password = req.body.password
        if (password == null) {
            password = getPassword(fromAddr)
        }
        try {
            let account = web3.eth.accounts.decrypt(backup, password);
            privateKey = account.privateKey
        } catch (error) {
            res.send({ "err": "请输入正确的密码！" });
            return false
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
})

function getOneERC20Token(contractAddress) {
    let filepath = path.resolve(__dirname, './solinterface/token.json');
    let interfacestring = JSON.parse(fs.readFileSync(filepath)).interface;
    let interface = JSON.parse(interfacestring);
    let contract = new web3.eth.Contract(interface, contractAddress)
    return contract;
}

function checkContractAddress(token) {
    for (const key in cfg["contractAddr"]) {
        if (key == token) {
            return cfg["contractAddr"][key]
        }
    }
    return false
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