var RNDBModel = require('react-native-db-models')

var DB = {
    app: new RNDBModel.create_db('app'),
    projects: new RNDBModel.create_db('projects'),
    timePeriods: new RNDBModel.create_db('timePeriods')
}

module.exports = DB;
