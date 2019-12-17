已完成
1.生成地址
2.导出私钥
3.导入私钥
4.eth余额查询
5.token余额查询
6.eth转账
7.token转账


下期工作内容
1.token监控功能
2.数据加密传输与保持到数据库
3.转账功能拆分为账单生成与签名和转账两部，账单生成与签名离线操作
4.性能优化

一、运行方法：
	1.本程序依赖nodejs运行，nodejs环境安装自行百度
	2.在项目根路径下运行npm install 安装项目所需的依赖包
	3.修改配置文件，在conf目录下有dev.js和main.js，dev.js为测试环境，main.js为生产环境，根据自己搭建的节点和需要用到的合约分别修改http和contractAddr两个字段，可以参考dev.js的配置方法
	4.让项目跑起来，在项目根路径下，启动main.js配置的运行npm run build，启动dev.js配置的运行npm run start
	5.备注：目前生成和导入的私钥均以备份文件保存在backup目录下，需要配合密码进行使用，后期考虑再加密一层

二、测试方法
	1.生成地址
		请求类型：POST
		地址：http://127.0.0.1/CreateAccount
		参数：password -> string
		例子：curl -H "Content-Type: application/json" -X POST  --data '{"password":"123"}' http://127.0.0.1/CreateAccount
	2.导出私钥
		请求类型：GET
		地址：http://127.0.0.1/GetPrivateKey
		参数：address -> string, password -> string
		例子：curl http://127.0.0.1/GetPrivateKey?address=0xe36888006b74b0c1cDeb537EFe00b28B3E4d9dB6\&password=123
	3.导入私钥
		请求类型：POST
		地址：http://127.0.0.1/importPrivateKey
		参数：privateKey -> string, password -> string
		例子：curl -H "Content-Type: application/json" -X POST  --data '{"password":"123", "privateKey":"0x5eb2b5cc620260b2f4e126db24adcceb6263d77dacbf528a72d576adad33344b"}' http://127.0.0.1/importPrivateKey
	4.eth余额查询
		请求类型：GET
		地址：http://127.0.0.1/GetEthBalance
		参数：address -> string
		例子：curl http://127.0.0.1/GetEthBalance?address=0xb5e3E5D51fCa7150357a46cFD3Dfd303e8f14638
	5.token余额查询
		请求类型：GET
		地址：http://127.0.0.1/GetTokenBalance
		参数：token -> string, address -> string
		例子：curl http://127.0.0.1/GetTokenBalance?token=EnerZ\&address=0xD8F8F2341be23cAfeECfed04Ce4C654acBd47768
	6.eth转账
		请求类型：POST
		地址：http://127.0.0.1/transaction
		参数：fromAddr -> string, toAddr -> string, password -> string, amount -> number
		例子：curl -H "Content-Type: application/json" -X POST  --data '{"fromAddr":"0xb5e3E5D51fCa7150357a46cFD3Dfd303e8f14638", "toAddr":"0xf17f52151EbEF6C7334FAD080c5704D77216b732","password":"123","amount":0.001}' http://127.0.0.1/transaction
	7.token转账
		请求类型：POST
		地址：http://127.0.0.1/transaction
		参数：fromAddr -> string, toAddr -> string, password -> string, token -> string, amount -> number
		例子：curl -H "Content-Type: application/json" -X POST  --data '{"token":"TRX","fromAddr":"0xb5e3E5D51fCa7150357a46cFD3Dfd303e8f14638", "toAddr":"0xf17f52151EbEF6C7334FAD080c5704D77216b732","password":"123","amount":0.001}' http://127.0.0.1/transaction