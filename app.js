const app = require('express')();
const server = require('http').Server(app);
const morgan = require('morgan');
const bodyParser = require('body-parser');
const Web3 = require('web3');
const path = require('path');
const fs = require('fs');
const cfg = require("./conf/conf").getCfg();
const db = require("./src/db")
const tool = require("./src/tool")
const httpCli = require("./src/httpClient")

var redis = require("redis")
var bluebird = require("bluebird")
var redisCli = redis.createClient(cfg.redis);
bluebird.promisifyAll(redis.RedisClient.prototype);

app.use(morgan('dev'));
app.use(bodyParser.json())
const web3 = new Web3(cfg["http"]);

// http监听80端口
server.listen(80);
console.log("开启http服务，端口：80")

let contractList = new Map(cfg.contractAddr) // 合约地址
let accountsList = new Map(); // 账户列表

db.query("t_account", null, function(res){
    if (res.code != 0) {
        console.log(res.msg)
    }else{
        for (let i = 0; i < res.msg.length; i++) {
            const data = res.msg[i];
            const backup = tool.bufferToJson(data.backup)
            accountsList.set(data.address, backup)
            redisCli.hset(data.appid, data.address, true)
        }
        // console.log(accounts)
    } 
})

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
    res.send(fail("无效的请求"))
})

// 测试用
app.get('/', function (req, res) {
    res.send(success("ok"));
});


//获取以太坊主链代币数量
app.get('/GetEthBalance', async function (req, res) {
    if (req.query.address == "" || req.query.address == null) {
        res.send(fail("请输入要查询的地址！"))
        return
    }
    // console.log(req.query.address)
    let check = web3.utils.isAddress(req.query.address)
    console.log(check)
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
app.post('/importPrivateKey', function (req, res) {
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
    db.query_obj("t_account", [wallet.address, JSON.stringify(backfile), appid, time, "user input"], function(e){
        if (e.code != 0) {
            console.log("存储数据出错：", e)
            res.send(fail(e))
        }else{
            console.log("成功导入账号，地址：%s，私钥尾号：%s", wallet.address, privateKey.substr(privateKey.length - 6, privateKey.length))
            accountsList.set(wallet.address, backfile)
            redisCli.hset(appid, wallet.address, true)
            res.send(success("ok"))
        }
    })
})

// 通过官方web3创建私钥和备份文件
app.get('/CreateAccount', function (req, res) {
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
    db.query_obj("t_account", [wallet.address, JSON.stringify(backfile), appid, time, "system create"], function(e){
        if (e.code != 0) {
            console.log("存储数据出错：", e)
            res.send(fail(e))
        }else{
            console.log("成功创建地址：%s", wallet.address)
            accountsList.set(wallet.address, backfile)
            redisCli.hset(appid, wallet.address, true)
            res.send(success({"address": wallet.address}))
        }
    })
})


// 充值流程 检测到有充值，通知后端，后端查询返回充值数量
//模拟后端，区块链检测到有代币充值，通知这个接口
app.post('/rechargeCallback', async function (req, res) {
    console.log("收到充值回调", req.body)
    //拿到有充值成功的地址和时间
    let address = req.body.address
    let time = req.body.time
    let appid = req.body.appid
    if (address == null || time == null) {
        res.send(fail("参数不足"))
        return
    }
    res.send(success("服务端收到充值信息"))

    //请求充值地址的余额
    let data = {"address": address, "time": time}
    httpCli.POST(appid, "/queryRecharge", data)
    .then((data, error)=>{
        if (error) {
            console.log("-充值结果查询出错->", error)
        }
        console.log("-充值结果查询结果->", data)
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
    if (!ok) {
        res.send(fail("参数错误"))
        return
    }
    let value = await redisCli.hgetAsync(address, txHash)
    redisCli.hdel(address, txHash)
    res.send(success({"address": address, "value": value}))
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
    console.log("收到后台提币请求", req.body)
    let token = req.body.token
    let address = req.body.address
    let amount = req.body.amount
    let appid = req.body.appid
    let order = req.body.order
    let checkAddress = web3.utils.isAddress(address)
    if (order == null) {
        res.send(fail("参数不足"))
        return
    }
    if (!checkAddress || typeof(amount) != "number") {
        res.send(fail("参数错误"))
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

    // 获得管理员私钥
    let password = tool.getPassword(adminAddress)
    let backup = accountsList.get(adminAddress)
    let account = web3.eth.accounts.decrypt(backup, password);

    res.send(success("token服务器收到提币请求"))
    console.log("收到提币请求: order:%s, appid:%s, token:%s, toAddress:%s, amount:%s", order, appid, token, address, amount)

    // 向后端校验
    let data = {"address": address, "amount": amount, "token": token, "order": order, "appid": appid}
    httpCli.POST(appid, cfg.checkTokenWithdraw, data)
    .then((msg, error)=>{
        if (error) {
            console.log("请求后端%s接口出错：order:%s, msg:%s", cfg.checkTokenWithdraw, order, error.message)
            return
        }
        if (msg.code != 0) {
            console.log("提币校验失败: order:%s, msg:%s", order, msg)
        }else{
            console.log("提币校验成功: order:%s, msg:%s", order, msg)
            
            // 校验成功，发起转账
            transactionToken(token, adminAddress, account.privateKey, address, amount, appid, order)
        }
    })
})

async function transactionToken(token, adminAddress, privateKey, toAddr, amount, appid, order){
    try {
        let contractAddress = contractList.get(token)
        let filepath = path.resolve(__dirname, './src/token.json');
        let interfacestring = JSON.parse(fs.readFileSync(filepath)).interface;
        let interface = JSON.parse(interfacestring);
        let contract = new web3.eth.Contract(interface, contractAddress)

        let decimals = await contract.methods.decimals().call();
        let coinAmount = amount * Math.pow(10, decimals);
        let tokenData = contract.methods.transfer(toAddr, coinAmount).encodeABI();
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
        if (gas < 23000) {gas = 23000}
        txParms.gas = gas;
        txParms.gasPrice = gasPrice * 1.1; // 提高gasPrice确保转账正常

        let signTx = await web3.eth.accounts.signTransaction(txParms, privateKey);
        web3.eth.sendSignedTransaction(signTx.rawTransaction)
        .on('receipt', function (receipt) {
            console.log("区块链转账成功：order:%s, tx:%s, blockNumber:%s, from:%s, to:%s, toke:%s, amount:%d", order, receipt.transactionHash, receipt.blockNumber, adminAddress, toAddr, token, amount)
        })
        .on('confirmation', function (confirmationNumber, receipt) {
            if (confirmationNumber === 12) { 
                // 12次确认后再通知服务端
                let data = {"code": 0, "address": toAddr, "amount": amount, "order": order}
                httpCli.POST(appid, cfg.withdrawPath, data)
                .then((msg, error)=>{
                    if (error) {
                        console.log("请求后端%s接口出错：order:%s, msg:%s", cfg.withdrawPath, order, error)
                        return
                    }
                    if (msg.code != 0) {
                        console.log("提币成功，但通知后端失败: order:%s, msg:%s", order, msg)
                    }else{
                        console.log("提币成功，成功通知后端: order:%s, msg:%s", order, msg)
                    }
                })
            }
        })
        .on('error', function (error) {
            // 已经提交账单到节点了，有可能是手续费太低了，注意查看账单是不是还在节点的队列里面，如果是，需要增加手续费把原来的账单覆盖广播
            console.log("提币转账事件错误：order:%s, err:%s", order, error.message); 
            let data = {"code": 500, "msg":"提币转账事件错误", "address": toAddr, "order": order}
            httpCli.POST("backConsole", cfg.backErrorPath, data)
            .then((msg, error)=>{
                if (error) {
                    console.log("通知后台%s接口出错：order:%s, msg:%s", cfg.backErrorPath, order, error)
                    return
                }
                if (msg.code != 0) {
                    console.log("通知后台转账错误时出错了：order:%s, msg:%s", order, msg)
                }else{
                    console.log("成功通知后台转账错误了：order:%s, msg:%s", order, msg)
                }
            })
        });
    } catch (error) {
        // 在准备账单的时候发生异常，有可能缺少了哪些必要的数据，账单还没开始广播，重新提交就可以了
        console.log("提币转账发生异常：", error.message);
        let msg ={"code": 501, "msg":"提币转账错误", "address": toAddr, "order": order}
        httpCli.POST("backConsole", cfg.backErrorPath, msg)
        .then((data, error)=>{
            if (error) {
                console.log("通知后台%s接口出错：order:%s, msg:%s", cfg.backErrorPath, order, error)
            }
            console.log("-通知后端提币结果->", data)
        })
    }
}


// 提币
app.post('/tibi', async function (req, res) {
    let toAddr = req.body.toAddr        // 对方地址
    let amount = req.body.amount        // 转账金额
    let token = req.body.token          // 转账代币
    let des = req.body.des              // 转账备注
    let appid = req.body.appid          // 渠道appid
    if (toAddr == null || amount == null || token == null || appid == null) {
        res.send(fail("请输入正确的参数！"))
        return
    }
    if (!tool.checkAppid(appid)) {
        res.send(fail("appid不支持！"))
        return
    }
    let adminAddress = tool.getAdminAddress(appid)
    if (!accountsList.has(adminAddress)) {
        res.send(fail("找不到管理员备份文件！"))
        return
    }
    if (!contractList.has(token)) {
        res.send(fail("合约地址不支持！"))
        return
    }

    console.log("发起提币：to:%s, toke:%s, amount:%d", toAddr, token, amount)

    // 获取管理员账户
    let backup = accountsList.get(adminAddress)
    let password = tool.getPassword(adminAddress)
    let admin = web3.eth.accounts.decrypt(backup, password);
    

    let contractAddress = contractList.get(token)
    let inter = tool.getTokenInterface()
    let contract = new web3.eth.Contract(inter, contractAddress)

    try {
        let decimals = await contract.methods.decimals().call();
        let coinAmount = amount * Math.pow(10, decimals);
        let tokenData = contract.methods.transfer(toAddr, coinAmount).encodeABI();
    
        let txParms = {
            from: adminAddress,
            to: contractAddress,
            data: tokenData,
            value: "0x0",
            chainId: cfg.chainId
        }
        let nonce = await web3.eth.getTransactionCount(adminAddress);
        txParms.nonce = nonce;
        let gas = await web3.eth.estimateGas(txParms);
        let gasPrice = await web3.eth.getGasPrice();
        txParms.gas = gas;
        txParms.gasPrice = gasPrice * 1.1;
        // console.log("参数：", txParms)
        let signTx = await web3.eth.accounts.signTransaction(txParms, admin.privateKey);

        web3.eth.sendSignedTransaction(signTx.rawTransaction)
        .on('receipt', function (receipt) {
            console.log("转账成功：transactionHash:%s, blockNumber:%s, from:%s, to:%s, toke:%s, amount:%d", receipt.transactionHash, receipt.blockNumber, adminAddress, toAddr, token, amount)
            let data = [receipt.blockNumber, receipt.transactionHash, adminAddress, toAddr, token, amount, des != null ? des:""]
            db.query_obj("t_transaction", data, function(e){
                if (e.code != 0) {
                    console.log("存储数据出错：", e)
                }
            })

            // TODO: 后台提币，回调到后端
            let cb = {"address":toAddr, "amount": amount, "txHash":receipt.transactionHash}

            res.send(success(cb))
        })
        // .on('confirmation', function (confirmationNumber, receipt) {
        //     console.log("确认次数：", confirmationNumber)
        //     if (confirmationNumber === 12) {
        //         console.log("完成12次确认：\n" + JSON.stringify(receipt));
        //     }
        // })
        .on('error', function (error) {
            console.log("转账出错：", error.message);
        });

    } catch (error) {
        console.log("提币出错：", error.message)
    }
})


// 以太坊转账
app.post('/transaction', async function (req, res) {
    let fromAddr = req.body.fromAddr    // 转账地址
    let toAddr = req.body.toAddr        // 对方地址
    let amount = req.body.amount        // 转账金额
    let token = req.body.token          // 转账代币
    let des = req.body.des              // 转账备注
    let appid = req.body.appid          // 渠道appid
    if (!tool.checkAppid(appid)) {
        res.send(fail("appid不支持！"))
        return
    }
    if (fromAddr == null || toAddr == null || amount == null) {
        res.send(fail("请输入正确的参数！"))
        return
    }

    let checkFromAddr = web3.utils.isAddress(fromAddr)
    if (checkFromAddr == false) {
        res.send(fail("请输入有效的fromAddr！"))
        return
    }
    let checkToAddr = web3.utils.isAddress(toAddr)
    if (checkToAddr == false) {
        res.send(fail("请输入有效的toAddr！"))
        return
    }
    let toAddress = toAddr // 保存转出地址
    if (typeof (amount) != "number") {
        res.send(fail("转账金额格式为number！"))
        return
    }
    if (des == null) {
        des = ""
    }
    if (!accountsList.has(fromAddr)) {
        res.send(fail("请先导入私钥"));
        return
    }

    let privateKey = ""
    let password = req.body.password
    if (password == null) {
        password = tool.getPassword(fromAddr)
    }
    try {
        let backup = accountsList.get(fromAddr)
        let account = web3.eth.accounts.decrypt(backup, password);
        privateKey = account.privateKey
    } catch (error) {
        res.send(fail("请输入正确的密码！"));
        return false
    }

    console.log("发起转账：from:%s, to:%s, toke:%s, amount:%d", fromAddr, toAddr, token, amount)

    let toAmount = 0
    let tokenData = "0x00"
    if (token == null || token == "ETH") {
        toAmount = web3.utils.toWei(amount.toString(), 'ether');
    }else{
        if (!contractList.has(token)) {
            res.send(fail("合约地址不支持！"))
            return
        }
        let contractAddress = contractList.get(token)
        let inter = tool.getTokenInterface()
        let contract = new web3.eth.Contract(inter, contractAddress)
        let decimals = await contract.methods.decimals().call(); // 获取最小单位
        let coinAmount = amount * Math.pow(10, decimals);
        tokenData = contract.methods.transfer(toAddr, coinAmount).encodeABI();
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
        res.send(fail("账户余额不足转账金额加手续费"))
        return
    }

    // 用密钥对账单进行签名
    let signTx = await web3.eth.accounts.signTransaction(txParms, privateKey);
    // 将签过名的账单进行发送
    web3.eth.sendSignedTransaction(signTx.rawTransaction)
        // .on('transactionHash', function (hash) {
        //     console.log("transactionHash:" + hash);
        // })
        .on('receipt', function (receipt) {
            // console.log("receipt:", receipt)
            console.log("转账成功：transactionHash:%s, blockNumber:%s, from:%s, to:%s, toke:%s, amount:%d", receipt.transactionHash, receipt.blockNumber, fromAddr, toAddress, token, amount)
            let data = [receipt.blockNumber, receipt.transactionHash, fromAddr, toAddress, token, amount, des]
            db.query_obj("t_transaction", data, function(e){
                if (e.code != 0) {
                    console.log("存储数据出错：", e)
                }
            })

            res.send(success(receipt))
        })
        // .on('confirmation', function (confirmationNumber, receipt) {
        //     if (confirmationNumber === 12) {
        //         console.log("完成12次确认：\n" + JSON.stringify(receipt));
        //     }
        // })
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