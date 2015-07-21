var _ = require('underscore');
var RNDBModel = require('react-native-db-models');
var RNS = require('react-native-store');
var Promise = require('promise-es6').Promise;
var Events = require('eventemitter3');

var DB = {
    app: (resolve, reject) => RNS.table('app').then(resolve, reject),
    project: (resolve, reject) => RNS.table('project').then(resolve, reject),
    timePeriod: (resolve, reject) => RNS.table('timePeriod').then(resolve, reject),
    events: new Events()
};

DB.settings = function (resolve, reject) {
    DB.get('app', 1).then(resolve, (err) => {
        DB.saveOrUpdate('app', {}).then(resolve, reject);
    }, reject);
};

DB.get = function (type, id) {
    return new Promise((resolve, reject) => {
        console.log("fetching", type, id);
        DB[type]((tbl) => {
            console.log("Got table", type);
            var objs = tbl.get(id);
            if (objs.length > 0) {
                resolve(tbl.get(id)[0]);
            } else {
                reject && reject();
            }
        }, reject);
    });
};

DB.remove = function (type, obj) {
    return new Promise((resolve, reject) => {
        DB[type]((tbl) => {
            tbl.removeById(obj._id);
            tbl.commit().then(() => {
                DB.events.emit("removed_" + type, obj);
            });
        });
    });
};

DB.saveOrUpdate = function (type, data) {
    var isNew = data._id == null;
    return new Promise((resolve, reject) => {
        DB[type]((tbl) => {
            console.log("got table, saving");
            var result = false;

            if (isNew) {
                result = _.extend({}, data);
                tbl.add(result);
            } else {
                var id = tbl.updateById(data._id, _.omit(data, '_id'))[0];
                result = tbl.get(id);
            }

            console.log("result", result);
            if (result) {
                tbl.commit().then((tbl) => {
                    console.log("Committed", type, data);
                    resolve(result);
                }, reject);
            } else {
                reject && reject();
            }
        });
    }).then((result) => {
        if (isNew) {
            DB.events.emit("new_" + type, result);
        }
        console.log("Fireing event", "changed_" + type);
        DB.events.emit("changed_" + type, result);
    });
}

module.exports = DB;
