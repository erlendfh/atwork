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

DB.get = function (type, id) {
    return new Promise((resolve, reject) => {
        console.log("fetching", type, id);
        DB[type]((tbl) => {
            console.log("Got table", type);
            var objs = tbl.get(id);
            if (objs.length > 0) {
                resolve(tbl.get(id)[0]);
            } else {
                reject();
            }
        }, reject);
    });
};

DB.saveOrUpdate = function (type, data) {
    var isNew = data._id == null;
    return new Promise((resolve, reject) => {
        RNS.table(type).then((tbl) => {

            console.log("got table, saving");

            var result = false;

            if (isNew) {
                result = tbl.add(_.extend({}, data));
            } else {
                result = tbl.updateById(data._id, _.omit(data, '_id'))[0];
            }

            console.log("result", result);
            if (result) {
                tbl.commit().then((tbl) => {
                    console.log("Committed", tbl);
                    resolve(result);
                }, reject);
            } else {
                reject();
            }
        });
    }).then((result) => {
        if (isNew) {
            DB.events.emit("new_" + type, result);
        }
        DB.events.emit("changed_" + type, result);
    });
}

module.exports = DB;
