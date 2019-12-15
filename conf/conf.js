module.exports = {
    getCfg: () => {
        let env = process.env['NODE_ENV'];
        if(env == "production"){
            return require('./main');
        }else{
            return require('./dev');
        }
    }
}
