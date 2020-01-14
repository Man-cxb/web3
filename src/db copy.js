const mysql = require('mysql');
const cfg = require("../conf/conf").getCfg();
const pool = mysql.createPool(cfg.mysql);
const querySql = new Map(cfg.querySql);
const insertSql = new Map(cfg.insertSql)
module.exports = {
    query: (tb, parm, callback) => {
        if (!querySql.has(tb)) {
            callback(cb(500, "找不到表名"));
            return
        }
        let sql = querySql.get(tb)
        if (tb == "t_transaction") {
            if (parm == null) {
                callback(cb(500, "确实参数"));
                return
            }else{
                let len = 1
                for (const key in parm) {
                    if (len > 1) {
                        sql = sql + " and " + key + " = \'" + parm[key] + "\'"
                    }else{
                        sql = sql + " " + key + " = \'" + parm[key] + "\'"
                    }
                    len += 1
                }
            }
        }
        pool.getConnection((error,connection) => {
            if(error){
                callback(cb(500, error.message));
                connection.release()
            }else{
                connection.query(sql, (error, result) => {
                    if(error){
                        callback(cb(500, error.message));
                    }else{
                        callback(cb(0, result));
                    }
                    connection.release()
                })
            }
        })
    },
    query_obj: (tb, parm, callback) => {
        if (!insertSql.has(tb)) {
            callback(cb(500, "找不到表名"));
            return
        }
        let sql = insertSql.get(tb)
        pool.getConnection((error, connection) => {
            if(error){
                callback(cb(500, error.message));
                connection.release()
            }else{
                connection.query(sql, parm, (error, result) => {
                    if(error){
                        callback(cb(500, error.message));
                    }else{
                        callback(cb(0, result));
                    }
                    connection.release()
                })
            }
        })
    }
}

function cb(code, msg){
    return {
        "code": code,
        "msg": msg
    }
}
