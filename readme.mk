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
		请求类型：GET
		地址：http://127.0.0.1/CreateAccount
		参数：appid -> string
		例子：curl http://127.0.0.1/CreateAccount?appid=id123
	2.导出私钥(抛弃)
		请求类型：GET
		地址：http://127.0.0.1/GetPrivateKey
		参数：address -> string, password -> string
		例子：curl http://127.0.0.1/GetPrivateKey?address=0xe36888006b74b0c1cDeb537EFe00b28B3E4d9dB6\&password=123
	3.导入私钥
		请求类型：POST
		地址：http://127.0.0.1/importPrivateKey
		参数：privateKey -> string, appid -> string
		例子：curl -H "Content-Type: application/json" -X POST  --data '{"appid":"id123", "privateKey":"0x5eb2b5cc620260b2f4e126db24adcceb6263d77dacbf528a72d576adad33344b"}' http://127.0.0.1/importPrivateKey
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
		参数：fromAddr -> string, toAddr -> string, password -> string, amount -> number, appid -> string
		例子：curl -H "Content-Type: application/json" -X POST  --data '{"fromAddr":"0xb5e3E5D51fCa7150357a46cFD3Dfd303e8f14638", "toAddr":"0xf17f52151EbEF6C7334FAD080c5704D77216b732","appid":"id123","password":"123","amount":0.001}' http://127.0.0.1/transaction
	7.token转账
		请求类型：POST
		地址：http://127.0.0.1/transaction
		参数：fromAddr -> string, toAddr -> string, password -> string, token -> string, amount -> number, appid -> string
		例子：curl -H "Content-Type: application/json" -X POST  --data '{"token":"TRX","fromAddr":"0xb5e3E5D51fCa7150357a46cFD3Dfd303e8f14638", "toAddr":"0xf17f52151EbEF6C7334FAD080c5704D77216b732","appid":"id123","password":"123","amount":0.001}' http://127.0.0.1/transaction
	8.提币
		请求类型：POST
		地址：http://127.0.0.1/tibi
		参数：toAddr -> string, appid -> string, token -> string, amount -> number
		例子：curl -H "Content-Type: application/json" -X POST  --data '{"token":"TRX", "toAddr":"0x95F2C680aB5Ee873f1694913230cf28DE4Cd6a77","appid":"id123","amount":1}' http://127.0.0.1/tibi

2019.12.24更新
1.改文件存储为mysql存储
2.增加白名单功能
3.增加安全机制，注册账号改为get请求，无需传入参数，密码根据算法生成
4.修改转账机制，转账时增加user参数，传入参数需与配置相同方可，转出地址如果是用户自己导入的，还需传入password字段，否则去掉该字段，注意以上参数变动
5.数据库增加两个字段，需要自行增加
6.使用pm2部署，如果想要按main.js配置启动，需要先运行 export NODE_ENV='production'
	具体部署方法
	1.安装pm2：npm install -g pm2 
	2.启动pm2：pm2 start app.js
	3.停止pm2：pm2 delete app.js
	4.查看状态：pm2 list
	关于pm2的其他用法可以参考http://blog.leanote.com/post/307729748@qq.com/pm2%E4%BD%BF%E7%94%A8%E6%95%99%E7%A8%8B

2019.1.1更新
1.增加appid
2.增加提币接口
3.优化数据库存储

TODO：
1.提币完成通知游戏后端
2.完善代币监测及汇总功能
3.后端获取到账接口

2019.1.5更新
1.更新与后端交互模式
2.增加redis数据库，方便多进程数据共享
3.api服务与区块链订阅服务分开两个进程运行，需分别启动（app.js和subscribe.js）

TODO：
1.优化代码
2.数据入库（目前充值和提现数据还没入库）

-------------------------------------
 后端接口要求
 协议：http
 请求类型：POST
 
 功能1：充值
 区块链收到代币时通知后端
 后端提供接口："/rechargeCallback"
 收到参数：address, time
 收到后向token服务器查询
 token服务器查询接口："/queryRecharge"
 参数需求：address，time
 返回参数：address, amount

功能2：提现
后台向服务端提交提现订单
token服务器接口："/requestWithdraw"
需要参数：token, address, amount, appid
token服务器向后端请求验证
后端提供接口："/checkTokenWithdraw"
收到参数：address, amount, token
验证成功后直接转账，转账成功与否都通知后端
后端提供接口："/tokenWithdrawCallback"
收到参数：address, amount
 ------------------------------------
