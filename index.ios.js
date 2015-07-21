/**
* Sample React Native App
* https://github.com/facebook/react-native
*/
'use strict';
console.log("***** Booting *****")
var dateFormat = require('dateformat');
var RCTPushNotificationManager = require('NativeModules').PushNotificationManager;
var AWUtils = require('NativeModules').AWUtils;
var React = require('react-native');
var Promise = require('promise-es6').Promise;
var _ = require('underscore');
var Events = require('eventemitter3');

var {
    AWLocationManager
} = React.NativeModules;

var {
    AppRegistry,
    Image,
    ListView,
    Navigator,
    NativeAppEventEmitter,
    PushNotificationIOS,
    ScrollView,
    StyleSheet,
    Text,
    TouchableHighlight,
    View,
} = React;

PushNotificationIOS.requestPermissions();

PushNotificationIOS.setApplicationIconBadgeNumber(42);

AWUtils.registerForNotifications()

AWUtils.presentLocalNotification({
    alertBody: "Test notification",
    category: "new_job"
});

NativeAppEventEmitter.addListener('ChangedLocationAuthorizationStatus', (newStatus) => {
    console.log("New auth status", newStatus);
});

NativeAppEventEmitter.addListener('ReceivedActionForLocalNotification', (action) => {
    console.log("action", action);
    if (action.identifier == "cancel_job") {
        cancelJob(action.notification.userInfo.projectId).then(() => {
            AWUtils.presentLocalNotification({
                alertBody: "Cancelled project"
            });
        });
    }
});

function startJob(projectId) {
    projectId = Number(projectId);

    return new Promise((resolve, reject) => {
        DB.timePeriod((timePeriods) => {
            console.log("Starting project", projectId);
            var activeTimePeriods = timePeriods.where({
                projectId: projectId,
                endTime: null
            }).find();

            var timePeriod;
            if (activeTimePeriods.length) {
                timePeriod = activeTimePeriods[0];
            } else {
                timePeriod = {
                    startTime: new Date().getTime(),
                    projectId: projectId
                };
                timePeriods.add(timePeriod);
            }
            console.log("Committing...");
            timePeriods.commit().then(() => {
                console.log("Committed")
                setSetting({activeProject: projectId, activeTimePeriod: timePeriod._id}).then(resolve.bind(null, timePeriod), reject);
                console.log("emitting changed_timePeriod");
                DB.events.emit("changed_timePeriod", timePeriod);
            }, reject);
        }, reject);
    });
}

function stopJob(projectId) {
    projectId = Number(projectId);
    return new Promise((resolve, reject) => {
        console.log("Stopping project", projectId);
        DB.timePeriod((timePeriods) => {
            console.log("Got time periods...");
            var endTime = new Date().getTime();
            timePeriods.where({
                projectId: projectId,
                endTime: null
            }).update({
                endTime: endTime
            });

            var updatedTimePeriods = timePeriods.where({
                projectId: projectId,
                endTime: endTime
            }).find();

            var activeTimePeriod = updatedTimePeriods.length && updatedTimePeriods[0];
            if (activeTimePeriod && activeTimePeriod.endTime - activeTimePeriod.startTime < 300000) {
                console.log("time span too short, removing time periods");
                timePeriods.where({
                    endTime: endTime
                }).remove();
                activeTimePeriod = null;
            } else {
                console.log("time span long enough", activeTimePeriod, activeTimePeriod.endTime, activeTimePeriod.startTime);
            }

            timePeriods.commit().then(() => {
                setSetting({activeProject: null, activeTimePeriod: null}).
                    then(resolve.bind(null, activeTimePeriod), reject);
                console.log("emitting changed_timePeriod");
                DB.events.emit("changed_timePeriod", activeTimePeriod);
            }, reject);
        }, reject);
    });
}

function cancelJob(projectId) {
    return new Promise((resolve, reject) => {
        console.log("Cancelling project", projectId);
        DB.timePeriod((timePeriods) => {
            console.log("Got time periods...");
            timePeriods.where({
                projectId: projectId,
                endTime: null
            }).remove();

            timePeriods.commit().then(() => {
                setSetting({activeProject: null, activeTimePeriod: null}).
                    then(resolve, reject);
                console.log("emitting changed_timePeriod");
                DB.events.emit("changed_timePeriod", null);
            }, reject);
        }, reject);
    });
}

NativeAppEventEmitter.addListener('DidEnterRegion', (region) => {
    console.log("Entered region", region);
    var projectPromise = DB.get('project', region.identifier);

    DB.settings((settings) => {
        if (settings.activeProject != region.identifier) {
            var stopStart;
            if (settings.activeProject) {
                console.log("Stopping active project", settings.activeProject);

                stopStart = new Promise((resolve, reject) => {
                    stopJob(settings.activeProject).then(() => {
                        startJob(region.identifier).then((timePeriod) => {
                            console.log("started timePeriod", timePeriod._id);
                            resolve(timePeriod);
                        }, reject);
                    }, reject);
                });
            } else {
                console.log("starting project for region", region.identifier)
                stopStart = startJob(region.identifier);
            }

            Promise.all([stopStart, projectPromise]).then((values) => {
                var [timePeriod, project] = values;
                console.log("Presenting local notification", timePeriod, project);
                AWUtils.presentLocalNotification({
                    alertBody: "Starting project " + project.name,
                    category: "new_job",
                    userInfo: {
                        "projectId": project._id,
                        "timePeriod": timePeriod._id
                    }
                });
            });
        } else {

        }
    });
});

NativeAppEventEmitter.addListener('DidExitRegion', (region) => {
    console.log("Left region", region);
    DB.settings((settings) => {
        console.log("Loaded settings", settings);
        if (settings.activeProject == region.identifier) {
            AWUtils.presentLocalNotification({
                alertBody: "Left region " + region.identifier
            });
            stopJob(region.identifier);
        }
    });
});

AWLocationManager.authorizationStatus((err, result) => {
    console.log("Auth:", result);
});

AWLocationManager.requestAlwaysAuthorization();

var Button = require('react-native-button');

var t = require('tcomb-form-native');
var Form = t.form.Form;

var Project = t.struct({
    name: t.Str,
    latitude: t.maybe(t.Str),
    longitude: t.maybe(t.Str),
    range: t.maybe(t.Str),
    accuracy: t.maybe(t.Str)
});

var DB = require('./db');

DB.events.on('changed_project', (project) => {
    console.log("Updating region", project);
    if (project.latitude && project.longitude) {
        console.log("startMonitoringForRegion", AWLocationManager.startMonitoringForRegion);
        AWLocationManager.startMonitoringForRegion({
            longitude: project.longitude,
            latitude: project.latitude,
            radius: project.range + "",
            identifier: project._id + ""
        }, (err) => {
            console.log("Monitoring added");
        });
    }
});

DB.events.on('removed_project', (project) => {
    console.log("Removing region", project);
    AWLocationManager.stopMonitoringForRegion({
        longitude: project.longitude,
        latitude: project.latitude,
        radius: project.range + "",
        identifier: project._id + ""
    }, (err) => {
    });

});

var Dimensions = require('Dimensions');
var {width, height} = Dimensions.get('window');
height -= 20;

function setSetting(newSettings) {
    newSettings._id = 1;
    console.log("new settings: ", newSettings);
    return DB.saveOrUpdate('app', newSettings).then(() => {
        console.log("Saved settings");
    }, (err) => {
        console.log("Failed to save settings");
    });
}

var NewProjectCard = React.createClass({
    render() {
        return (
            <View style={styles.container}>
                <Button onPress={this.props.onCreateNew}>+ Create New</Button>
            </View>
        );
    }
});

var ProjectCard = React.createClass({
    toggleActive() {
        var projectId = this.props.project._id;
        console.log("project id", projectId, this.props.activeProject);
        if (this.props.activeProject == projectId) {
            stopJob(this.props.activeProject);
        } else {
            startJob(projectId);
        }
    },

    render() {
        var project = this.props.project;
        return (<View style={styles.container}>
            <Text style={{margin: 20}}>Project: {project.name} #{project._id}</Text>
            <Text>Active Project: {this.props.activeProject}</Text>
            <Button onPress={this.toggleActive}>{this.props.activeProject == project._id ? "Stop" : "Start"}</Button>
            <Button onPress={this.props.onViewWorkLog} style={{marginTop: 30}}>View work log</Button>
            <Button onPress={this.props.onEditProject} style={{marginTop: 30}}>Edit</Button>
            <Button onPress={this.props.onRemove} style={{marginTop: 30}}>Delete</Button>
        </View>);
    }
});

var ProjectList = React.createClass({
    getInitialState() {
        return {
            projects: []
        };
    },

    componentDidMount() {
        this.refreshList();
        DB.events.on('changed_project', this.refreshList);
        DB.events.on('removed_project', this.refreshList);
    },

    refreshList() {
        console.log("refreshing projects...");
        DB.project((tbl) => {
            console.log("got table", tbl);
            var projects = tbl.where().find();
            this.setState({projects:_.values(projects)});
        });
    },

    handleRemove(project) {
        DB.remove('project', project);
    },

    render() {
        console.log("render project list", this.state.projects);
        var projects = _.map(this.state.projects, (project) => {
            return (<View key={project._id} style={{width:width,height:height}}>
                <ProjectCard
                    onViewWorkLog={this.props.onViewWorkLog.bind(null, project)}
                    onRemove={this.handleRemove.bind(null, project)}
                    onEditProject={this.props.onEditProject.bind(null, project)}
                    activeProject={this.props.activeProject}
                    project={project} />
            </View>);
        });

        console.log("returning new structure");
        return (<ScrollView pagingEnabled={true} horizontal={true} alwaysBounceVertical={false}>
            {projects}
            <View style={{width:width,height:height}}>
                <NewProjectCard onCreateNew={this.props.onCreateNewProject} />
            </View>
        </ScrollView>);
    }
});

var ProjectEditor = React.createClass({
    _handleSave() {
        console.log("validation", this.refs.form.validate());
        if (this.refs.form.validate().errors.length == 0) {
            var project = _.extend({}, this.refs.form.getValue());
            project._id = this.props.project && this.props.project._id;
            this.props.onSave(project);
        }
    },

    render() {
        var options = {};
        return (<View style={{padding: 20}}>
            <Text style={styles.title}>New Project</Text>
                <Form
                    ref="form"
                    type={Project}
                    value={this.props.project}
                    options={options}
                />

            <View style={styles.actions}>
                <Button style={styles.action} onPress={this._handleSave}>Save</Button>
                <Button style={styles.action} onPress={this.props.onCancel}>Cancel</Button>
            </View>
        </View>);
    }
});

var WorkLogViewer = React.createClass({
    getInitialState() {
        return {
            dataSource: new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2})
        };
    },

    componentDidMount() {
        this.refreshList();
        DB.events.on('changed_timePeriod', () => {
            this.refreshList();
        });
    },

    refreshList() {
        console.log("Refreshing Work Log");
        DB.timePeriod((timePeriods) => {
            var rows = timePeriods.where({
                projectId: this.props.project._id
            }).find();
            console.log("Got time periods", JSON.stringify(rows));
            this.setState({
                dataSource: this.state.dataSource.cloneWithRows(rows)
            });
        });
    },

    render() {
        return (
            <ListView
                dataSource={this.state.dataSource}
                renderRow={this._renderRow}
            />
        );
    },

    _renderRow(rowData) {
        return (<View style={styles.workLogRow}>
            <Text>From: {dateFormat(rowData.startTime, "isoDateTime")}</Text>
            <Text>To: {rowData.endTime ? dateFormat(rowData.endTime, "isoDateTime") : "Running..."}</Text>
        </View>);
    }
});

var AtWork = React.createClass({

    getInitialState() {
        return {
            tracking: false,
            activeProject: null
        };
    },

    reloadSettings() {
        DB.settings((settings) => {
            console.log("Loaded fresh settings", settings);
            this.setState({activeProject: settings.activeProject});
        })
    },

    componentDidMount() {
        this.reloadSettings();
        DB.events.on("changed_app", this.reloadSettings);
    },

    _onToggle() {
        this.setState({tracking: !this.state.tracking});
    },

    handleCreateNewProject() {
        console.log("Creating new project...");
        this.setState({
            editedProject: {
                name: "mCASH",
                latitude: "59.917963",
                longitude: "10.749727"
            }
        }, () => {
            this.refs.navigator.push({id:"projectEditor"});
        })
    },

    handleEditProject(project) {
        console.log("Editing project...");
        DB.get('project', project._id).then((_project) => {
            this.setState({
                editedProject: _project
            }, () => {
                this.refs.navigator.push({id:"projectEditor"});
            });
        });
    },

    handleViewWorkLog(project) {
        this.refs.navigator.push({id:"viewWorkLog", project: project});
    },

    _renderScene(route, navigator) {
        console.log("route", route);
        switch (route.id) {
            case 'projectList':
                return <ProjectList
                    ref={(ref) => {this.projectList = ref;}}
                    activeProject={this.state.activeProject}
                    onViewWorkLog={this.handleViewWorkLog}
                    onEditProject={this.handleEditProject}
                    onCreateNewProject={this.handleCreateNewProject} />;
            case 'projectEditor':
                return <ProjectEditor
                    project={this.state.editedProject}
                    onSave={(project) => {
                        console.log("Saving project...")

                        DB.saveOrUpdate('project', project).then(() => {
                            this.setState({
                                editedProject: null
                            }, () => {
                                navigator.pop();
                            })
                        });
                    }}

                    onCancel={() => {
                        this.setState({
                            editedProject: null
                        }, () => {
                            navigator.pop()
                        })
                    }} />;
            case 'viewWorkLog':
                return <WorkLogViewer
                    project={route.project} />;
        }

    },

    render: function() {
        return (<Navigator
            ref="navigator"
            initialRoute={{id:'projectList'}}
            renderScene={this._renderScene}
        />);
    }
});

var styles = StyleSheet.create({
    scrollView: {
        backgroundColor: '#6A85B1',
        height: 300,
    },
    horizontalScrollView: {
        height: 120,
    },
    containerPage: {
        height: 50,
        width: 50,
        backgroundColor: '#527FE4',
        padding: 5,
    },

    title: {
        fontSize: 30,
        flex: 1,
        textAlign: "center",
        flexDirection: "column"
    },

    text: {
        fontSize: 20,
        color: '#888888',
        left: 80,
        top: 20,
        height: 40,
    },

    actions: {
        flex: 2,
        flexDirection: 'row'
    },

    action: {
        flex: 1
    },

    button: {
        margin: 7,
        padding: 5,
        alignItems: 'center',
        backgroundColor: '#eaeaea',
        borderRadius: 3,
    },
    buttonContents: {
        flexDirection: 'row',
        width: 64,
        height: 64,
    },
    img: {
        width: 64,
        height: 64,
    },

    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    toggleButton: {
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        overflow: "hidden",
        backgroundColor: "#cccccc"
    },

    toggleButtonText: {
        fontSize: 20
    },

    welcome: {
        fontSize: 20,
        textAlign: 'center',
        margin: 10,
    },
    instructions: {
        textAlign: 'center',
        color: '#333333',
        marginBottom: 5,
    },

    /** Work Log **/
    workLogRow: {
        padding: 10,
        borderBottomWidth: 1
    }
});

AppRegistry.registerComponent('AtWork', () => AtWork);
