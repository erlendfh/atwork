/**
* Sample React Native App
* https://github.com/facebook/react-native
*/
'use strict';
console.log("***** Booting *****")
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
    AWUtils.presentLocalNotification({
        alertBody: "ReceivedActionForLocalNotification"
    });
});

NativeAppEventEmitter.addListener('DidEnterRegion', (region) => {
    console.log("Entered region", region);
    console.log("PushNotificationIOS.presentLocalNotification", AWUtils.presentLocalNotification);
    if (settings.activeProject != region.identifier) {
        DB.get('project', region.identifier).then((project) => {
            DB.saveOrUpdate('timePeriods', {
                startTime: new Date().getTime(),
                projectId: project._id
            }).then((timePeriod) => {
                AWUtils.presentLocalNotification({
                    alertBody: "Starting project " + project.name,
                    category: "new_job",
                    userInfo: {
                        "projectId": project._id,
                        "timePeriod": timePeriod._id
                    }
                });
                setSetting({activeProject: region.identifier, activeTimePeriod: timePeriod._id});
            });
        });
    }
});

NativeAppEventEmitter.addListener('DidExitRegion', (region) => {
    console.log("Left region", region);
    if (settings.activeProject == region.identifier) {
        AWUtils.presentLocalNotification({
            alertBody: "Left region " + region.identifier
        });
        setSetting({activeProject: null, activeTimePeriod: null});
    }
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

DB.events.on('changed_project', (id) => {
    console.log("Fetching changed project", id);
    DB.get('project', id).then((project) => {
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
});

// var Carousel = require('react-native-looped-carousel');
var Dimensions = require('Dimensions');
var {width, height} = Dimensions.get('window');
height -= 20;

var settings = {};

DB.get('app', 1).then((_settings) => {
    console.log("Loaded settings", _settings);
    settings = _settings;
}, (err) => {
    DB.app((tbl) => {
        settings = tbl.add(settings)[0];
        console.log("created settings", settings);
    });
});

function setSetting(newSettings) {
    console.log("setting", newSettings);
    for (var key in newSettings) {
        settings[key] = newSettings[key];
    }
    return DB.saveOrUpdate('app', settings).then(() => {
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
        var newActiveProject = this.props.activeProject != projectId ? projectId : null;
        setSetting({activeProject: newActiveProject});
    },

    render() {
        var project = this.props.project;
        return (<View style={styles.container}>
            <Text style={{margin: 20}}>Project: {project.name} #{project._id}</Text>
            <Text>Active Project: {this.props.activeProject}</Text>
            <Button onPress={this.toggleActive}>{this.props.activeProject == project._id ? "Stop" : "Start"}</Button>
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
        DB.project((tbl) => {
            tbl.removeById(project._id);
            this.refreshList();
        });
    },

    render() {
        console.log("render project list", this.state.projects);
        var projects = _.map(this.state.projects, (project) => {
            return (<View key={project._id} style={{width:width,height:height}}>
                <ProjectCard
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

var AtWork = React.createClass({

    getInitialState() {
        return {
            tracking: false,
            activeProject: settings.activeProject
        };
    },

    componentDidMount() {
        DB.events.on("changed_app", () => {
            this.setState({activeProject: settings.activeProject});
        });
    },

    _onToggle() {
        this.setState({tracking: !this.state.tracking});
    },

    _handleCreateNewProject() {
        console.log("Creating new project...");
        this.refs.navigator.push({id:"projectEditor"});
    },

    _handleEditProject(project) {
        console.log("Editing project...");
        DB.get('project', project._id).then((_project) => {
            this.setState({
                editedProject: _project
            }, () => {
                this.refs.navigator.push({id:"projectEditor"});
            });
        });
    },

    _renderScene(route, navigator) {
        console.log("route", route);
        switch (route.id) {
            case 'projectList':
                return <ProjectList
                    ref={(ref) => {this.projectList = ref;}}
                    activeProject={this.state.activeProject}
                    onEditProject={this._handleEditProject}
                    onCreateNewProject={this._handleCreateNewProject} />;
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
});

AppRegistry.registerComponent('AtWork', () => AtWork);
