
/*
// 测试db
const db = require("./src/db")
let accounts = new Map();
db.query("t_account", null, function(res){
    if (res.code != 0) {
        console.log(res.msg)
    }else{
        for (let i = 0; i < res.msg.length; i++) {
            const data = res.msg[i];
            accounts.set(data.address, data.backup)
        }
        console.log(accounts)
    } 
})

db.query("t_transaction", "\'0x866e6993e3230999e49892a05e0450c7402e28d5414b1d20e6f365ce973d2a9e\'", function(res){
    console.log(res)
})
*/

/*
//测试事件
const EventEmitter = require('events');

class MyEmitter extends EventEmitter {}
const myEmitter = new MyEmitter();
myEmitter.on('event', () => {
  console.log('触发事件');
});
myEmitter.on('event2', () => {
    console.log('触发事件2');
  });
myEmitter.emit('event');
myEmitter.emit('event2');
*/

/*
//签名和转账测试
let Tx = require('./src/Tx')
tt()
async function tt(){
    let fromAddr = "0xb5e3E5D51fCa7150357a46cFD3Dfd303e8f14638"
    let fromPriKey = "0x5eb2b5cc620260b2f4e126db24adcceb6263d77dacbf528a72d576adad33344b"
    let toAddr = "0xf17f52151EbEF6C7334FAD080c5704D77216b732"
    let amount = 1
    let contractAddress = "0xb37867855b769834dc6e44f86325b046d668541f"
    let data = await Tx.signTxToken(fromAddr, fromPriKey, toAddr, contractAddress, amount)
    console.log(data)
    Tx.transaction(data.signTx)
}
*/

// const clas = require("./src/clas")
// let aa = new clas(1,1,1,1,1)
// console.log(aa)
