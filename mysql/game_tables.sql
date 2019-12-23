DROP TABLE IF EXISTS `t_account`;
CREATE TABLE `t_account` (
    `address` char(42) NOT NULL comment '地址',
    `backup` blob comment '备份文件',
    PRIMARY KEY (`address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `t_transaction`;
CREATE TABLE `t_transaction` (
    `block` varchar(10) NOT NULL comment '区块高度',
    `txHash` char(66) NOT NULL comment '转账哈希',
    `fromAddress` char(42) NOT NULL comment '转出地址',
    `toAddress` char(42) NOT NULL comment '转入地址',
    `coin` varchar(10) NOT NULL comment '代币类型',
    `amount` int(32) NOT NULL comment '转账金额',
    PRIMARY KEY (`fromAddress`, `toAddress`, `txHash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
