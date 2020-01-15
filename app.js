const app = require('express')();
const server = require('http').Server(app);
const morgan = require('morgan');
const bodyParser = require('body-parser');
const Web3 = require('web3');
const path = require('path');
const fs = require('fs');
const cfg = require("./conf/conf").getCfg();
const request = require('request-promise');
const db = require("./src/db")
const tool = require("./src/tool")
const md5 = require("md5-node")
const redis = require("redis")
const bluebird = require("bluebird")
const redisCli = redis.createClient(cfg.redis);
bluebird.promisifyAll(redis.RedisClient.prototype);

app.use(morgan('dev'));
// app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
const web3 = new Web3(cfg["http"]);

// http监听1686端口
server.listen(1686);
console.log("开启http服务，端口：1686")

let contractList = new Map(cfg.contractAddr) // 合约地址
let accountsList = new Map(); // 账户列表

db.dbmgr("t_account", "query")
.then((record)=>{
    if (record.code == 0) {
        for (let i = 0; i < record.msg.length; i++) {
            const data = record.msg[i];
            const backup = tool.bufferToJson(data.backup)
            accountsList.set(data.address, backup)
            redisCli.hset(data.appid, data.address, true)
        }
    }else{
        console.log("查询数据库出错！！")
    }
})

app.use('*',(req, res, next) => {
    var ip = req.headers['x-real-ip'] ? req.headers['x-real-ip'] : req.ip.replace(/::ffff:/, '');
    for (const key in cfg.whitelist) {
        if (key == ip) {
            console.log("来自%s，ip：%s的请求，url：", cfg.whitelist[key], ip, req.baseUrl)
            next()
            return
        }
    }
    console.log("无效请求：ip:%s, url:%s", ip, req.baseUrl)
    res.send(fail("无效的请求"))
})

//获取以太坊主链代币数量
app.get('/GetEthBalance', async function (req, res) {
    if (req.query.address == "" || req.query.address == null) {
        res.send(fail("请输入要查询的地址！"))
        return
    }
    // console.log(req.query.address)
    let check = web3.utils.isAddress(req.query.address)
    if (check == false) {
        res.send(fail("请输入有效的地址！"))
        return
    }
    let eth = await web3.eth.getBalance(req.query.address);
    let balance = web3.utils.fromWei(eth, 'ether')
    res.send(success(balance))
})

//获取合约代币资产
app.get('/GetTokenBalance', async function (req, res) {
    let check = web3.utils.isAddress(req.query.address)
    if (check == false) {
        res.send(fail("请输入有效的地址！"))
        return
    }
    let token = req.query.token
    if (token == null) {
        res.send(fail("请输入有效的代币类型！"))
        return
    }

    if (!contractList.has(token)) {
        res.send(fail("合约地址不支持！"))
        return
    }
    let contractAddress = contractList.get(token)
    let inter = tool.getTokenInterface()
    let contract = new web3.eth.Contract(inter, contractAddress)
    let symbol = await contract.methods.symbol().call();
    let balance = await contract.methods.balanceOf(req.query.address).call();
    let decimals = await contract.methods.decimals().call(); // 获取最小单位
    let value = balance / Math.pow(10, decimals);
    let data = {"symbol": symbol, "balance": value}
    res.send(success(data))
})

// 导入私钥
app.post('/importPrivateKey', async function (req, res) {
    let appid = req.body.appid
    if (!tool.checkAppid(appid)) {
        res.send(fail("appid不支持！"))
        return
    }
    let privateKey = req.body.privateKey
    if (privateKey == "" || privateKey == null) {
        res.send(fail("请输入正确的参数！"))
        return
    }
    let wallet
    try {
        wallet = web3.eth.accounts.privateKeyToAccount(privateKey)
    } catch (error) {
        res.send(fail("请输入正确的私钥！"))
        return
    }
    let password = tool.getPassword(wallet.address)
    let backfile = web3.eth.accounts.encrypt(wallet.privateKey, password);

    // 数据入库
    let time = Date.now()
    let msg = await db.dbmgr("t_account", "save", [wallet.address, JSON.stringify(backfile), appid, time, "user input"])
    if (msg.code == 0) {
        console.log("成功导入账号，地址：%s，私钥尾号：%s", wallet.address, privateKey.substr(privateKey.length - 6, privateKey.length))
        accountsList.set(wallet.address, backfile)
        redisCli.hset(appid, wallet.address, true)
        res.send(success("ok"))
    }else{
        res.send(fail(msg))
    }
})

// 通过官方web3创建私钥和备份文件
app.get('/CreateAccount', async function (req, res) {
    let appid = req.query.appid
    if (!tool.checkAppid(appid)) {
        res.send(fail("appid不支持！"))
        return
    }
    let wallet = web3.eth.accounts.create();
    let password = tool.getPassword(wallet.address)
    let backfile = web3.eth.accounts.encrypt(wallet.privateKey, password);
    // console.log("地址：%s，私钥：%s", wallet.address, wallet.privateKey)
    // 数据入库
    let time = Date.now()
    let msg = await db.dbmgr("t_account", "save", [wallet.address, JSON.stringify(backfile), appid, time, "system create"])
    if (msg.code == 0) {
        console.log("成功创建地址：%s", wallet.address)
        accountsList.set(wallet.address, backfile)
        redisCli.hset(appid, wallet.address, true)
        res.send(success({"address": wallet.address}))
    }else{
        res.send(fail(msg))
    }
})

// 检查地址是否合法
app.get('/checkAddress', function (req, res) {
    let address = req.query.address
    if (!address) {
        res.send(fail('{"msg":"缺少参数！","errorCode":2}'))
        return
    }
    let appid = req.query.appid
    if (!appid) {
        res.send(fail('{"msg":"缺少参数！","errorCode":2}'))
        return
    }

    let cfg = tool.getGameCfg(appid)
    if (!cfg) {
        res.send(fail('{"msg":"缺少配置","errorCode":3}'))
        return
    }
    if (cfg.isOpenWithdraw!=1){
        res.send(fail('{"msg":"未开放提币","errorCode":4}'))
        return
    }
    let ok = web3.utils.isAddress(address)
    if (ok) {
        res.send(success(true))
    }else{
        res.send(fail('{"msg":"地址不合法","errorCode":5}'))
    }
})

// 关于redis的查询和删除
app.get('/redis', async function (req, res) {
    let op = req.query.op
    let key = req.query.key
    let value = req.query.value
    if (op == null || key == null) {
        res.send("缺少参数！")
        return
    }
    if (op == "query") {
        let ok = await redisCli.hexistsAsync(key, value)
        if (ok == 0) {
            res.send("查询不到记录")
            return
        }
        let value = await redisCli.hgetAsync(address, txHash)
        res.send("查询结果：" + value)
    }else if (op == "del") {
        let ok = await redisCli.hexistsAsync(key, value)
        if (ok == 0) {
            res.send("查询不到记录")
            return
        }
        redisCli.hdel(key, value)
        res.send("成功删除key:" + key + " value:" + value)
    }else if (op == "getall") {
        let arr = await redisCli.hgetallAsync(key)
        res.send("查询结果：" + arr)
    } else{
        res.send("找不多指定的操作！")
        return
    }
})

// 充值流程 检测到有充值，通知后端，后端查询返回充值数量
//模拟后端，区块链检测到有代币充值，通知这个接口
app.post('/rechargeCallback', async function (req, res) {
    console.log("收到充值回调", req.body)
    //拿到有充值成功的地址和时间
    let address = req.body.address
    let txHash = req.body.txHash
    if (address == null || txHash == null) {
        res.send(fail("参数不足"))
        return
    }
    res.send(success("服务端收到充值信息"))

    let options = {
        method: 'POST',
        uri: "http://127.0.0.1:1686/queryRecharge",
        body: {"address": address, "txHash": txHash},
        json: true
    };
    //请求充值地址的余额
    request(options).then((msg)=>{
        console.log("服务端查询充值结果：", msg)
    })
})

// 查询充值接口
app.post('/queryRecharge', async function (req, res) {
    console.log("有人查询充值记录：", req.body)
    // 验证参数
    let address = req.body.address
    let txHash = req.body.txHash
    if (address == null || txHash == null) {
        res.send(fail("参数不足"))
        return
    }

    let ok = await redisCli.hexistsAsync(address, txHash)
    if (ok == 0) {
        res.send(fail("查询不到充值记录"))
        return
    }
    let value = await redisCli.hgetAsync(address, txHash)
    redisCli.hdel(address, txHash)
    res.send(success({"address": address, "value": Number(value)}))
})

// 提币流程 收到后台的提币请求，发送后端验证成功，转账成功通知后端
// 模拟后端，接受token校验
app.post('/checkTokenWithdraw', async function (req, res) {
    console.log("收到token服务器提币校验", req.body)
    let token = req.body.token
    let address = req.body.address
    let value = req.body.value
    // 后端校验逻辑。。。

    res.send(success("后端校验成功"))
})

//模拟服务端收到token服务器提币结果回调
app.post('/tokenWithdrawCallback', async function (req, res) {
    console.log("收到token服务器提币结果", req.body)
    res.send(success("后端收到了提币的结果！"))
})

// 提币请求接口
app.post('/requestWithdraw', async function (req, res) {
    console.log("收到后台提币请求:", req.body)
    let token = req.body.token
    let address = req.body.address
    let amount = Number(req.body.amount)
    let appid = req.body.appid
    let order = req.body.order
    let checkAddress = web3.utils.isAddress(address)
    if (order == null) {
        res.send(fail("参数不足"))
        return
    }
    if (!checkAddress) {
        res.send(fail("提币地址非法"))
        return
    }
    if (amount == 0) {
        res.send(fail("amount参数错误"))
        return
    }
    if (!contractList.has(token)) {
        res.send(fail("合约地址不支持！"))
        return
    }
    let adminAddress = tool.getAdminAddress(appid)
    if (!adminAddress) {
        res.send(fail("缺少配置！"))
        return
    }

    // 同一个order防止重复提交
    let has = await redisCli.hexistsAsync("pending", order)
    if (has == 1) {
        res.send(fail("订单处理中，不可重复提交！"))
        return
    }else{
        redisCli.hset("pending", order, true)
    }

    res.send(success("token服务器收到提币请求"))
    console.log("收到提币请求: order:%s, appid:%s, token:%s, toAddress:%s, amount:%s", order, appid, token, address, amount)

    // 获得管理员私钥
    let password = tool.getPassword(adminAddress)
    let backup = accountsList.get(adminAddress)
    let account = web3.eth.accounts.decrypt(backup, password);

    // 向后端校验
    let data = {"address": address, "amount": amount, "token": token, "order": order, "appid": appid}

    let msg = await tool.sendHttp(appid, cfg.checkTokenWithdraw, data, "game", "校验提币请求")
    if (msg.code == 0) {
        // 校验成功，发起转账
        transactionToken(token, adminAddress, account.privateKey, address, amount, appid, order)
    }else{
        console.log("校验提币请求失败，order:", order, msg)
    }
})

async function transactionToken(token, adminAddress, privateKey, toAddr, amount, appid, order){
    try {
        let contractAddress = contractList.get(token)
        let filepath = path.resolve(__dirname, './src/token.json');
        let interfacestring = JSON.parse(fs.readFileSync(filepath)).interface;
        let interface = JSON.parse(interfacestring);
        let contract = new web3.eth.Contract(interface, contractAddress)

        let decimals = await contract.methods.decimals().call();
        let toAmount = amount * Math.pow(10, decimals);
        console.log("--1>>", toAmount)
        let fromBalance = await contract.methods.balanceOf(adminAddress).call(); // 获取转出账户的余额
        console.log("--2>>", fromBalance)
        if (fromBalance < toAmount) {
            console.log("balance:%s, toAmount:%s", fromBalance, toAmount)
            tool.sendHttp(appid, cfg.backErrorPath, fail("账户token不足"), "console", "转账操作")
            redisCli.hdel("pending", order)
            return
        }

        let tokenData = contract.methods.transfer(toAddr, toAmount).encodeABI();
        console.log("--3>>", tokenData)
        let txParms = {
            from: adminAddress,
            to: toAddr,
            data: tokenData,
            value: "0x0",
            chainId: cfg.chainId
        }
        let nonce = await web3.eth.getTransactionCount(adminAddress);
        txParms.nonce = nonce;
        let gas = await web3.eth.estimateGas(txParms);
        let gasPrice = await web3.eth.getGasPrice();
        if (gas < 30000) {gas = 30000}
        txParms.gas = gas;
        txParms.gasPrice = gasPrice * 1.1; // 提高gasPrice确保转账正常

        let signTx = await web3.eth.accounts.signTransaction(txParms, privateKey);
        web3.eth.sendSignedTransaction(signTx.rawTransaction)
        .on('receipt', function (receipt) {
            console.log("区块链转账成功：order:%s, tx:%s, blockNumber:%s, from:%s, to:%s, toke:%s, amount:%d", order, receipt.transactionHash, receipt.blockNumber, adminAddress, toAddr, token, amount)
            redisCli.hdel("pending", order)

            // 成功提现的交易录入数据库
            db.dbmgr("t_withdraw", "save", [appid, receipt.transactionHash, adminAddress, toAddr, token, amount, Date.now(), ""])
        })
        .on('confirmation', function (confirmationNumber, receipt) {
            if (confirmationNumber === 12) { 
                // 12次确认后再通知服务端
                let data = {"code": 0, "address": toAddr, "amount": amount, "order": order, "msg": receipt.transactionHash}
                tool.sendHttp(appid, cfg.withdrawPath, data, "game", "转账操作")
            }
        })
        .on('error', function (error) {
            // 已经提交账单到节点了，有可能是手续费太低了，注意查看账单是不是还在节点的队列里面，如果是，需要增加手续费把原来的账单覆盖广播
            console.log("提币转账事件错误：order:%s, err:%s", order, error.message); 
            let sign = md5(order + cfg.backKey)
            let data = {"code": 500, "msg":"提币转账事件错误", "sign": sign, "order_num": order}
            tool.sendHttp(appid, cfg.backErrorPath, data, "console", "转账操作")
            redisCli.hdel("pending", order)
        });
    } catch (error) {
        // 在准备账单的时候发生异常，有可能缺少了哪些必要的数据，账单还没开始广播，重新提交就可以了
        console.log("提币转账发生异常：", error.message);
        let sign = md5(order + cfg.backKey)
        let data = {"code": 501, "msg":"提币转账错误", "sign": sign, "order_num": order}
        tool.sendHttp(appid, cfg.backErrorPath, data, "console", "转账操作")
        redisCli.hdel("pending", order)
    }
}



// 通过私钥转账ETH，本地开发用
app.post('/transactionETH', async function (req, res) {
    let privateKey = req.body.privateKey        // 转账私钥
    let toAddress = req.body.toAddress          // 对方地址
    let amount = req.body.amount                // 转账金额

    if (!privateKey || !toAddress || !amount) {
        res.send(fail("请输入正确的参数！"))
        return
    }

    let checkToAddrss = web3.utils.isAddress(toAddress)
    if (checkToAddrss == false) {
        res.send(fail("请输入有效的toAddress！"))
        return
    }

    let account = web3.eth.accounts.privateKeyToAccount(privateKey)
    let fromAddress = account.address

    console.log("发起转账：from:%s, to:%s, amount:%d", fromAddress, toAddress, amount)


    let toAmount = web3.utils.toWei(amount.toString(), 'ether');
    let txParms = {
        from: fromAddress,
        to: toAddress,
        value: web3.utils.toHex(toAmount),
        chainId: cfg.chainId
    }

    // 获取指定账户地址的交易数
    let nonce = await web3.eth.getTransactionCount(fromAddress);
    txParms.nonce = nonce;

    // 计算这笔转账所需的gas
    let gas = await web3.eth.estimateGas(txParms);
    txParms.gas = gas;

    // 预估当前的gas价格
    let gasPrice = await web3.eth.getGasPrice();
    txParms.gasPrice = gasPrice;

    // 检测账户余额是否满足这次交易
    let balance = await web3.eth.getBalance(fromAddress);
    if (balance < toAmount + gas * gasPrice) {
        console.log("balance:%s, toAmount:%s, gas:%s", balance, toAmount, gas*gasPrice)
        res.send(fail("账户余额不足"))
        return
    }

    // 用密钥对账单进行签名
    let signTx = await web3.eth.accounts.signTransaction(txParms, privateKey);

    // 将已签名的账单进行广播
    web3.eth.sendSignedTransaction(signTx.rawTransaction)
        .on('receipt', function (receipt) {
            console.log("转账成功：transactionHash:%s, blockNumber:%s, from:%s, to:%s, amount:%d", receipt.transactionHash, receipt.blockNumber, fromAddress, toAddress, amount)
            res.send(success(receipt))
        })
        .on('error', function (error) {
            console.log("转账出错：", error.message);
        });
})

// 通过私钥转账Token，本地开发用
app.post('/transactionToken', async function (req, res) {
    let privateKey = req.body.privateKey        // 转账私钥
    let toAddress = req.body.toAddress          // 对方地址
    let amount = req.body.amount                // 转账金额
    let token = req.body.token                  // 转账代币

    if (!privateKey || !toAddress || !amount || !token) {
        res.send(fail("请输入正确的参数！"))
        return
    }

    let checkToAddrss = web3.utils.isAddress(toAddress)
    if (checkToAddrss == false) {
        res.send(fail("请输入有效的toAddress！"))
        return
    }

    let account = web3.eth.accounts.privateKeyToAccount(privateKey)
    let fromAddress = account.address

    console.log("发起转账：from:%s, to:%s, toke:%s, amount:%d", account.address, toAddress, token, amount)

    if (!contractList.has(token)) {
        res.send(fail("合约地址不支持！"))
        return
    }

    // 准备合约数据
    let contractAddress = contractList.get(token)
    let inter = tool.getTokenInterface()
    let contract = new web3.eth.Contract(inter, contractAddress)
    let decimals = await contract.methods.decimals().call(); // 获取最小单位
    let toAmount = amount * Math.pow(10, decimals);
    let fromBalance = contract.methods.balanceOf(fromAddress).call(); // 获取转出账户的余额
    if (fromBalance < toAmount) {
        console.log("balance:%s, toAmount:%s", fromBalance, toAmount)
        res.send(fail("账户token不足"))
        return
    }

    let tokenData = contract.methods.transfer(toAddress, toAmount).encodeABI();

    let txParms = {
        from: account.address,
        to: contractAddress,
        data: tokenData,
        value: "0x00",
        chainId: cfg.chainId
    }

    // 获取指定账户地址的交易数
    let nonce = await web3.eth.getTransactionCount(fromAddress);
    txParms.nonce = nonce;

    // 计算这笔转账所需的gas
    let gas = await web3.eth.estimateGas(txParms);
    txParms.gas = gas;

    // 预估当前的gas价格
    let gasPrice = await web3.eth.getGasPrice();
    txParms.gasPrice = gasPrice;

    // 检测账户余额是否满足这次交易
    let balance = await web3.eth.getBalance(fromAddress);
    if (balance < gas * gasPrice) {
        res.send(fail("手续费不足"))
        return
    }

    // 用密钥对账单进行签名
    let signTx = await web3.eth.accounts.signTransaction(txParms, privateKey);

    // 将已签名的账单进行广播
    web3.eth.sendSignedTransaction(signTx.rawTransaction)
        .on('receipt', function (receipt) {
            console.log("转账成功：transactionHash:%s, blockNumber:%s, from:%s, to:%s, amount:%d", receipt.transactionHash, receipt.blockNumber, fromAddress, toAddress, amount)
            res.send(success(receipt))
        })
        .on('error', function (error) {
            console.log("转账出错：", error.message);
        });
})

function success (data) {
    return {
        code: 0,
        msg: data
    }
}

function fail (data) {
    return {
        code: 1,
        msg: data
    }
}
