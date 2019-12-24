module.exports = {
    http:"http://192.168.133.129:8544",
    ws:"ws://192.168.133.129:8543",
    // ws:"wss://mainnet.infura.io/ws",
    // http:"https://ropsten.infura.io/v3/ef34bbe49df548698d7cdba9dc103f9f"//测试网连接
    // http:"https://mainnet.infura.io/v3/ef34bbe49df548698d7cdba9dc103f9"
    chainId: 3,
    contractAddr: {
        EnerZ: "0x7bd0ae0e238d0ea2630b8aa3c4b9ad6248635ca6", //ropsten网络测试合约
        TRX: "0xb37867855b769834dc6e44f86325b046d668541f",   //ropsten网络测试合约
    },
    mysql: {
        host: '127.0.0.1',
        user: 'root',
        password: '123456',
        database: 'ethereum',
    },
    whitelist: {
        '127.0.0.1':'本地'
    },
    setSql: {
        "t_account": "insert into t_account (address, backup, time, des) value (?,?,?,?);",
        "t_transaction": "insert into t_transaction (block, txHash, fromAddress, toAddress, coin, amount) value (?,?,?,?,?,?);",
    },
    getSql: {
        "t_account": "select * from t_account where address = ?"
    },
    accountPassword: "123456",
    user:"abc@123"
}
