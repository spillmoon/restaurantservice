var mysql = require('mysql');
var async = require('async');
var dbConfig = require('../config/dbConfig');
var dbPoolConfig = require('../config/dbPoolConfig');
var path = require('path');
var url = require('url');


function createMenu(menu, callback) {
    var sql_insert_menu = 'INSERT INTO menu(name, price) ' +
        'VALUES (?, ?)';
    var sql_insert_file = 'INSERT INTO file(menu_id, filename, filepath) ' +
        'VALUES (?, ?, ?)';

    var menu_id;
    var dbConn = mysql.createConnection(dbConfig);

    dbConn.beginTransaction(function (err) {
        if (err) {
            return callback(err);
        }
        async.series([insertMenu, insertFile], function (err) {
            if (err) {
                return dbConn.rollback(function () {
                    callback(err);
                    dbConn.end();
                });
            }
            dbConn.commit(function () {
                callback(null, menu_id);
                dbConn.end();
            })
        });
    });

    function insertMenu(callback) {
        dbConn.query(sql_insert_menu, [menu.name, menu.price], function(err, result) {
            if (err) {
                return callback(err);
            }
            menu_id = result.insertId;
            callback(null);
        });
    }

    function insertFile(callback) {
        async.each(menu.files, function (item, done) {
            dbConn.query(sql_insert_file, [menu_id, item.name, item.path], function (err, result) {
                if (err) {
                    return done(err);
                }
                done(null);
            });
        }, function (err) {
            if (err) {
                return callback(err);
            }
            callback(null);
        });
        /* if (menu.files.length > 1) {
            async.each(menu.files, function (item, done) {
                dbConn.query(sql_insert_file, [menu_id, item.name, item.path], function (err, result) {
                    if (err) {
                        return done(err);
                    }
                    done(null);
                });
            }, function (err) {
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        } else if (menu.files.length < 1){
            callback(null);
        } else {
            dbConn.query(sql_insert_file, [menu_id, menu.files[0].name, menu.files[0].path], function (err, result) {
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        }*/
    }
}

function listMenus(pageNo, rowCount, callback) {
    var sql = 'SELECT id, name, price FROM menu ORDER BY id LIMIT ?, ?';

    var dbConn = mysql.createConnection(dbConfig);
    dbConn.query(sql, [rowCount * (pageNo - 1), rowCount], function (err, results) {
        if (err) {
            dbConn.end();
            return callback(err);
        }
        callback(null, results);
        dbConn.end();
    });
}

function findMenu(menuId, callback) {
    var sql_select_menu = 'SELECT id, name, price FROM menu WHERE id = ?';
    var sql_select_file = 'SELECT filename, filepath FROM file WHERE menu_id = ?';

    var dbPool = mysql.createPool(dbPoolConfig);
    dbPool.getConnection(function (err, conn) {
        if (err) {
            return callback(err);
        }
        var menu = {};
        async.parallel([selectMenu, selectFile], function(err, results) {
            if (err) {
                conn.release();
                return callback(err);
            }
            menu.id = results[0][0].id;
            menu.name =results[0][0].name;
            menu.price = results[0][0].price;
            menu.originalFilename = results[1][0].filename;
            var filename = path.basename(results[1][1].filepath);
            menu.fileUrl = url.resolve('http://localhost:3000', '/images/' + filename);
            conn.release();
            callback(null, menu);
        });

        function selectMenu(callback) {
            conn.query(sql_select_menu, [menuId], function (err, results) {
                if (err) {
                    return callback(err);
                }
                callback(null, results);
            });
        }

        function selectFile(callback) {
            conn.query(sql_select_file, [menuId], function(err, results) {
                if (err) {
                    return callback(err);
                }
                callback(null, results);
            });
        }
    });
}

module.exports.createMenu = createMenu;
module.exports.listMenus = listMenus;
module.exports.findMenu = findMenu;