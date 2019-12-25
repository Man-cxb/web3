DROP TABLE IF EXISTS `t_account`;
CREATE TABLE `t_account` (
    `address` char(42) NOT NULL comment '地址',
    `time` char(42) NOT NULL comment '注册时间',
    `des` char(42) NOT NULL comment '备注',
    `backup` blob comment '备份文件',
    PRIMARY KEY (`address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `t_transaction`;
CREATE TABLE `t_transaction` (
    `blockNum` varchar(10) NOT NULL comment '区块高度',
    `txHash` char(66) NOT NULL comment '转账哈希',
    `fromAddress` char(42) NOT NULL comment '转出地址',
    `toAddress` char(42) NOT NULL comment '转入地址',
    `coin` varchar(10) NOT NULL comment '代币类型',
    `amount` int(32) NOT NULL comment '转账金额',
    `des` varchar(64) NOT NULL comment '备注',
    PRIMARY KEY (`txHash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
