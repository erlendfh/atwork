/**
* Sample React Native App
* https://github.com/facebook/react-native
*/
'use strict';
var React = require('react-native');
var DB = require('react-native-store');

var AWLocationManager = React.NativeModules.AWLocationManager;
var Promise = require('promise-es6').Promise;
var _ = require('underscore');
var Events = require('eventemitter3')
var {
    AppRegistry,
    Image,
    Navigator,
    NativeAppEventEmitter,
    ScrollView,
    StyleSheet,
    Text,
    TouchableHighlight,
    View,
} = React;

NativeAppEventEmitter.addListener('ChangedLocationAuthorizationStatus', (newStatus) => {
    console.log("New auth status", newStatus);
})

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
    range: t.maybe(t.Num),
    accuracy: t.maybe(t.Num)
});

var DB = require('./db');
var DBEvents = require('react-native-db-models').DBEvents
DBEvents.on("all", function(){
    console.log("Database changed");
});

// var Carousel = require('react-native-looped-carousel');
var Dimensions = require('Dimensions');
var {width, height} = Dimensions.get('window');
height -= 20;

var settings = {};
var appEvents = new Events();

DB.app.get_id(1, (result) => {
    console.log("app", result);
    if (result.length == 0) {
        DB.app.add(settings, (result) => {
            settings = result;
            console.log("created settings", settings);
        });
    } else {
        settings = result[0];
        console.log("loaded settings", settings);
    }
    appEvents.emit("settings_changed");
});

function setSetting(setting, value) {
    console.log("setting", setting, value);
    var update = {};
    update[setting] = value;
    return new Promise((resolve, reject) => {
        console.log("updating...");
        DB.app.update_id(1, update, (table) => {
            settings[setting] = value;
            resolve();
        });
    }).then(() => {
        console.log("Saved, emitting event");
        appEvents.emit("settings_changed")
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
})

var ProjectCard = React.createClass({
    toggleActive() {
        var projectId = this.props.project._id;
        console.log("project id", projectId, this.props.activeProject);
        var newActiveProject = this.props.activeProject != projectId ? projectId : null;
        setSetting("activeProject", newActiveProject);
    },

    render() {
        var project = this.props.project;
        return (<View style={styles.container}>
            <Text style={{margin: 20}}>Project: {project.name} #{project._id}</Text>
            <Text>activeProject: {this.props.activeProject}</Text>
            <Button onPress={this.toggleActive}>{this.props.activeProject == project._id ? "Stop" : "Start"}</Button>
            <Button onPress={this.props.onRemove} style={{marginTop: 30}}>Delete</Button>
        </View>);
    }
});

var ProjectList = React.createClass({
    getInitialState() {
        return {};
    },

    componentDidMount() {
        this.refreshList();
    },

    refreshList() {
        DB.projects.get_all((projects) => {
            this.setState({projects: _.values(projects.rows)});
            console.log("projects", projects);
        });
    },

    handleRemove(project) {
        DB.projects.remove_id(project._id, () => {
            this.refreshList();
        });
    },

    render() {
        console.log("render project list");
        var projects = _.map(this.state.projects, (project) => {
            return (<View key={project._id} style={{width:width,height:height}}>
                <ProjectCard
                    onRemove={this.handleRemove.bind(null, project)}
                    activeProject={this.props.activeProject}
                    project={project} />
            </View>);
        });

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
        if (this.refs.form.validate()) {
            this.props.onSave(this.refs.form.getValue());
        }
    },

    render() {
        var options = {};
        return (<View style={{padding: 20}}>
            <Text style={styles.title}>New Project</Text>
                <Form
                    ref="form"
                    type={Project}
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
        appEvents.on("settings_changed", () => {
            this.setState({activeProject: settings.activeProject});
        });
    },

    _onToggle() {
        this.setState({tracking: !this.state.tracking});
    },

    _handleCreateNewProject() {
        console.log("Creating new project...");
        this.refs.navigator.push({id:"createNewProject"});
    },

    _renderScene(route, navigator) {
        console.log("route", route);
        switch (route.id) {
            case 'projectList':
                return <ProjectList
                    ref="projectList"
                    activeProject={this.state.activeProject}
                    onCreateNewProject={this._handleCreateNewProject} />;
            case 'createNewProject':
                return <ProjectEditor
                    onSave={(project) => {
                        project = _.extend({}, project);
                        DB.projects.add(project, (savedData) => {
                            navigator.pop();
                            if (this.refs.projectList) {
                                this.refs.projectList.refreshList();
                            }
                        });
                    }}
                    onCancel={() => navigator.pop()} />;
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
