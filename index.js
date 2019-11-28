/*
1.钱包功能，生成账户
2.转账功能
3.合约监控功能
4.api接口
*/

const Web3 = require('web3');
const fs = require('fs'); //file system =>文件系统
const path = require('path'); //路径库
var bip39 = require('bip39');//生成助记词
var hdkey = require('ethereumjs-wallet/hdkey');
var util = require('ethereumjs-util');
var Tx = require('ethereumjs-tx');
var ethers = require('ethers');
const IpConfig = require("./conf");

var web3 = new Web3(IpConfig["websockIp"]);//本地节点链接
GetEthNumber("0x1423953c941244994c10ab0007c80302a7db9c79");
//读取eth代币数量
function GetEthNumber(address) {
    // const address = '0xb5e3E5D51fCa7150357a46cFD3Dfd303e8f14638';
    let myeth = 0;//单位eth
    web3.eth.getBalance(address).then(e => {
        // console.log(e)
        myeth = web3.utils.fromWei(e, 'ether');;
        console.log(myeth);
    })
}

// GetAccountsForBackupFlie();
//通过备份文件获取私钥
function GetAccountsForBackupFlie() {
    const UserInputBackupFlie = path.resolve(__dirname, './beifen/0x139D9571E77CfA4EF59d8421666d787Ce59044FE.json')//地址前需要加上0x
    const BackupFlie = fs.readFileSync(UserInputBackupFlie, 'utf8');
    const UserPasswork = '1234567890';
    const UserAccounts = web3.eth.accounts.decrypt(BackupFlie, UserPasswork);
    const UserAddress = UserAccounts['address'];//获得地址
    const UserPrivateKey = UserAccounts['privateKey'];//获得私钥
    console.log("-->" + UserPrivateKey);
}

// lenqianbao();
//生成助记词（12个单词）和地址
function lenqianbao() {
    var mnemonic = bip39.generateMnemonic();
    var seed = bip39.mnemonicToSeed(mnemonic)
    var hdWallet = hdkey.fromMasterSeed(seed)
    var key1 = hdWallet.derivePath("m/44'/60'/0'/0/0")
    var address1 = util.pubToAddress(key1._hdkey._publicKey, true)
    address1 = util.toChecksumAddress(address1.toString('hex'))

    console.log("助记词：" + mnemonic + "\n地址：" + address1)
}

// GetEthNumber();
//读取eth代币数量
function GetEthNumber() {
    const address = '0xb5e3E5D51fCa7150357a46cFD3Dfd303e8f14638';
    let myeth = 0;//单位eth
    web3.eth.getBalance(address).then(e => {
        // console.log(e)
        myeth = web3.utils.fromWei(e, 'ether');;
        console.log(myeth);
    })
}
// SendTransaction();
//转账eth及状态查询
async function SendTransaction() {
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
}
//MonitoringCoin();
//SendTransaction();
// coinInfo();
coinTransaction();
console.log("--end--")
//获取代币信息
function coinInfo() {
    let contractAddress = "0xb37867855b769834dc6e44f86325b046d668541f";//合约地址
    let address = "0xb5e3E5D51fCa7150357a46cFD3Dfd303e8f14638";//代币地址
    let contract = getOneERC20Token(contractAddress);
    let total = contract.methods.totalSupply().call().then(e => { console.log("total:" + e) });//发行总量
    let name = contract.methods.name().call().then(e => { console.log("name:" + e) });//代币全称
    let symbol = contract.methods.symbol().call().then(e => { console.log("symbol:" + e) });//代币简称
    let userBalance = contract.methods.balanceOf(address).call().then(e => { console.log("balance:" + e) });//查询address地址代币数量
    console.log("total:" + total + " name:" + name + " symbol:" + symbol + " balance:" + userBalance);
}
//转账合约代币
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

function getOneERC20Token(contractAddress) {
    let filepath = path.resolve(__dirname, './solinterface/token.json');
    let interfacestring = JSON.parse(fs.readFileSync(filepath)).interface;
    // 智能合约 => ABIjfj
    let interface = JSON.parse(interfacestring);
    // 构建一个智能合约对象.并且返回(这个实例是和链上智能合约互动的一个桥梁)
    let contract = new web3.eth.Contract(interface, contractAddress)
    return contract;
}

//监测地址代币数量
// MonitoringCoin();
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
// test();
function test() {
    web3.eth.getBlock(2919000).then(e => {
        let a = e
        console.log(a)
    })
}
// testTran();
async function testTran() {
    let formAddress = '0xb5e3E5D51fCa7150357a46cFD3Dfd303e8f14638';//转账方地址
    let formPrivactkey = '5eb2b5cc620260b2f4e126db24adcceb6263d77dacbf528a72d576adad33344b';//转账方私钥
    let toAddress = '0x00CCDD96d2B8e55AbEBFeEB6CAC523edBc859aEB';//接收方地址
    let value = web3.utils.toWei("0.1", 'ether');
    let gas = await web3.eth.estimateGas(rawTx);
    let gasPrice = await web3.eth.getGasPrice();
    let nonce = await web3.eth.getTransactionCount(formAddress);
    let rawTx = {
        "from": formAddress,
        "nonce": web3.utils.toHex(nonce),
        "gasPrice": web3.utils.toHex(gasPrice),
        "gasLimit": web3.utils.toHex(gas),
        "to": toAddress,
        "value": web3.utils.toHex(value), // ether value, usually 0
        "data": "0x00",
        "chainId": 0x03  // mainnet chain
    };

    console.log("-1->" + rawTx)

    let privateKey = new Buffer(formPrivactkey, 'hex');
    let tx = new Tx(rawTx);
    tx.sign(privateKey);
    let serializedTx = tx.serialize();
    console.log("-2->" + serializedTx.toString('hex'));
    web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
        .on('transactionHash', function (hash) {
            // on 是事件机制,只有当方法调用过程中回调了transactionHash事件才会走到这里
            console.log("hash success:" + hash);
        })
        .on('receipt', function (receipt) {
            // console.log("")
        })
        .on('confirmation', function (confirmationNumber, receipt) {
            //会有24次确认，这里只要达到12次确认就不可篡改
            if (confirmationNumber < 12) {
                console.log("收到第" + confirmationNumber + "次确认");

            } else if (confirmationNumber === 12) {
                console.log("完成12次确认：\n" + JSON.stringify(receipt));
            }
        })
        .on('error', function (error) {
            console.log(error);
            //callback(error);
        });
}
// privateKeyToMnmonic("0x5eb2b5cc620260b2f4e126db24adcceb6263d77dacbf528a72d576adad33344b");
//秘钥转助记词
function privateKeyToMnmonic(privateKey) {
    // var privateKey = "0x5eb2b5cc620260b2f4e126db24adcceb6263d77dacbf528a72d576adad33344b";
    var wallet1 = ethers.Wallet.createRandom();
    console.log();
    // var wallet = new ethers.Wallet(privateKey);
    // console.log("Address: " + wallet.address);
    
}