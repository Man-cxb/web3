const mysql = require('mysql');
const cfg = require("./conf/conf").getCfg();

// 创建连接池
const pool = mysql.createPool(cfg.mysql);

module.exports = {
    // 不带参数的查询
    query: (sql, callback) => {
        pool.getConnection((error,connection) => {
            if(error){
                console.log('连接数据失败');
                callback(error);
                connection.release()
            }else{
                connection.query(sql, (error, result) => {
                    if(error){
                        callback(error);
                    }else{
                        callback(null, result);
                    }
                    connection.release()
                })
            }
        })
    },
    // 带参数的查询
    query_objc: (cp, tb, objc, callback) => {
        let sql = ""
        if (cp == "save") {
            for (const key in cfg.setSql) {
                if (key == tb) {
                    sql = cfg.setSql[key]
                }
            }
        }else if (cp == "query") {
            for (const key in cfg.getSql) {
                if (key == tb) {
                    sql = cfg.getSql[key]
                }
            }
        }
        if (sql == "") {
            callback({"err":"操作类型错误"});
            return
        }
        pool.getConnection((error, connection) => {
            if(error){
                callback(error);
                connection.release()
            }else{
                // 执行带参数的sql语句
                connection.query(sql, objc, (error, result) => {
                    if(error){
                        callback(error);
                    }else{
                        callback(null, result);
                    }
                    connection.release()
                })
            }
        })
    }
}
