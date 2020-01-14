const mysql = require('mysql');
const cfg = require("../conf/conf").getCfg();
const pool = mysql.createPool(cfg.mysql);
const querySql = new Map(cfg.querySql);
const insertSql = new Map(cfg.insertSql)

function query(sql, values) {
    return new Promise((resolve, reject) => {
        pool.getConnection(function (err, connection) {
            if (err) {
                reject(err)
            } else {
                connection.query(sql, values, (err, rows) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(rows)
                    }
                    connection.release()
                })
            }
        })
    })
}

async function dbmgr(tbname, op, value) {
    let sql = ""
    let parm = ""

    console.log("数据库操作：tbname: %s, op: %s, parm: %s", tbname, op, value)

    if (!querySql.has(tbname)) {
        console.log("找不到表%s", tbname)
        return cb(500, "找不到表")
    }

    if (op == "save") {
        sql = insertSql.get(tbname)
        if (!value) {
            console.log("存储数据缺少参数：", tbname, op, value)
            return cb(500, "缺少参数")
        } else {
            parm = value
        }
    } else {
        sql = querySql.get(tbname)
        if (value) {
            let len = 1
            for (const key in value) {
                if (len > 1) {
                    sql = sql + " and " + key + " = \'" + value[key] + "\'"
                } else {
                    sql = sql + " " + key + " = \'" + value[key] + "\'"
                }
                len += 1
            }
        }
    }

    try {
        let dataList = await query(sql, parm)
        return cb(0, dataList)
    } catch (error) {
        console.log("查询数据库异常：", error.message)
        return cb(500, error.message)
    }
}

function cb(code, msg) {
    return {
        "code": code,
        "msg": msg
    }
}

exports.dbmgr = dbmgr