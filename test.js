
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


var redis = require("redis")
var bluebird = require("bluebird")
var client = redis.createClient({host:"127.0.0.1", port:6379, password:123456});
bluebird.promisifyAll(redis.RedisClient.prototype);

client.hset("id123", "0x14106C1ba1d87f54b10bB5ae3bdE37413fD7B855", true)
client.hset("account", "qwe", "123")
client.hset('account','asd', 100);
// client.set('hello2',{name:"jacky",age:22});
client.hgetAsync('id123',"qwe").then(function(res) {
    console.log("--取值-->", res);
});
client.hgetallAsync('account').then(function(res) {
    console.log("--取出所有值-->", res);
});
client.hexistsAsync('account',"qwe").then(function(res) {
    console.log("--判断存在-->", res);
});
client.hkeysAsync('account').then(function(res) {
    console.log("--获取所有key-->", res);
});
client.hvalsAsync('account').then(function(res) {
    console.log("--获取所有value-->", res);
});
client.hincrbyAsync('account', "qwe", "1").then(function(res) {
    console.log("--给key加值-->", res);
});

client.on("subscribe", function (channel, count) {
    console.log("subscribe:",channel, count)
});
 
client.on("message", function (channel, message) {
    console.log("message:",channel, message)
});


// client.subscribe("a nice channel","sssss","333333");


