module.exports = {
    http:"http://192.168.133.129:8544",
    ws:"ws://192.168.133.129:8543",
    // ws:"wss://mainnet.infura.io/ws",
    // http:"https://ropsten.infura.io/v3/ef34bbe49df548698d7cdba9dc103f9f"//测试网连接
    // http:"https://mainnet.infura.io/v3/ef34bbe49df548698d7cdba9dc103f9"
    chainId: 3,
    //ropsten网络测试合约
    contractAddr: [
        ["TRX", "0xb37867855b769834dc6e44f86325b046d668541f"],
        ["EnerZ", "0x7bd0ae0e238d0ea2630b8aa3c4b9ad6248635ca6"]
    ],
    mysql: {
        host: '127.0.0.1',
        user: 'root',
        password: '123456',
        database: 'ethereum',
    },
    whitelist: {
        '127.0.0.1':'本地'
    },
    insertSql: [
        ["t_account", "insert into t_account (address, backup, appid, time, des) value (?,?,?,?,?);",],
        ["t_transaction", "insert into t_transaction (blockNum, txHash, fromAddress, toAddress, coin, amount, des) value (?,?,?,?,?,?,?);",]
    ],
    querySql: [
        ["t_account", "select * from t_account"],
        ["t_transaction", "select * from t_transaction where"]
        // ["t_transaction", "select * from t_transaction where fromAddress = ? and txHash = ?"]
    ],
        
    accountPassword: "123456", // 加密和解密私钥
    coldWallet: "0xb5e3E5D51fCa7150357a46cFD3Dfd30000000000", // 代币汇总地址
    appList: [
        {
            id: "id123",
            admin: "0xb5e3E5D51fCa7150357a46cFD3Dfd303e8f14638",
            gameHost: "127.0.0.1",
            gamePort: "1686",
            consoleHost: "127.0.0.1",// 后台id
            consolePort: "1686",
        }
    ],
    redis:{
        host:"127.0.0.1", 
        port:6379, 
        password:123456
    },
    rechargePath: "/rechargeCallback", // 后端接口，区块链收到币时通知
    checkTokenWithdraw: "/checkTokenWithdraw", // 后端接口，提币时向后端校验数据
    withdrawPath: "/tokenWithdrawCallback", // 后端接口，提现成功通知
    backErrorPath: "/tokenTranscationError", // 后台接口，区块链转账异常时通知
    backKey:"e03239b27e34a5f7f3bde739459dd537", // 后台密钥
}
