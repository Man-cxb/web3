/*
1.钱包功能，生成账户
2.转账功能
3.合约监控功能
4.api接口
*/

const Web3 = require('web3');
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