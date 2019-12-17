const Web3 = require('web3');
const cfg = require("./conf/conf").getCfg();
var web3 = new Web3(cfg["ws"]);

// web3.eth.subscribe('pendingTransactions', function (error, txid) {
//     if (error == null) {
//         web3.eth.getTransaction(txid).then(data => {
//             // console.log("转账hash：%s，from：%s，to：%s，value：%s", txid, data.from, data.to, web3.utils.fromWei(data.value, 'ether'))
//             if (data.to){
//                 for (const key in cfg.contractAddr) {
//                     if (cfg.contractAddr[key] == data.to.toLowerCase()) {
//                         console.log("--->>", data)
//                     }
//                 }
//             }
//         })
//     } else {
//         console.log(error);
//     }
// })
//     .on("data", function (transaction) {
//         // console.log("-->" + transaction);
//     });

// web3.eth.getTransaction("0xf462a43e7ccef26be807e54ab78714e792e72129262cfb0afcc499365327a644").then(data => {
//     console.log(data)
// })

// web3.eth.subscribe('logs', {
//     address: '0xf17f52151EbEF6C7334FAD080c5704D77216b732',
//     topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef']
// }, function (error, result) {
//     console.log("--err>",error)
//     console.log("--res>",result)
// });

web3.eth.subscribe('logs', {address: '0xb37867855b769834dc6e44f86325b046d668541f',topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef']}, function (error, data) {
    // console.log("--err>",error)
    console.log("--res>", data)
    // if (data.address.toLowerCase() == '0xb37867855b769834dc6e44f86325b046d668541f') {
    //     web3.eth.getTransaction(data.transactionHash).then(data => {
    //         // console.log("转账hash：%s，from：%s，to：%s，value：%s", txid, data.from, data.to, web3.utils.fromWei(data.value, 'ether'))
    //         if (data.to) {
    //             for (const key in cfg.contractAddr) {
    //                 if (cfg.contractAddr[key] == data.to.toLowerCase()) {
    //                     console.log("--->>", data)
    //                 }
    //             }
    //         }
    //     })
    // }
});