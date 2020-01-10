// let aa = "qwe"
// let cc = {}
// cc[aa] = 1

// if (cc["aaq"]) {
    
//     console.log(1)
// }else{
//     console.log(2)

// }
const crypto = require("crypto")
const md5 = require("md5-node")
let data = "abc"
let sign = crypto.createHash('md5').update(data).digest("hex")
console.log(sign)
console.log(md5(data))