/** @jsx React.DOM */

/*
 * Loads JSON from url, sets state.fieldName with it and and sets
 * state.fieldName'Loaded' to true to prevent running a second time.
 */
function getJsonLoaderMixin(url, fieldName) {
    var fieldNameLoaded = fieldName + 'Loaded';
    return {
        componentWillMount: function() {
            if (this.state[fieldNameLoaded]) {
                return;
            }
            // TODO: remove setTimeout (it's just to illustrate)
            setTimeout((function() {
                $.ajax({
                    url: url,
                    success: (function(data) {
                        var newState = {};
                        newState[fieldNameLoaded] = true;
                        newState[fieldName] = data;
                        this.setState(newState);
                    }).bind(this),
                    error: function(req, txtStatus, txtErr) {
                        console.error('Failed:', req, txtStatus, txtErr);
                    }
                });
            }).bind(this), 1000);
        }
    };
}

var ScheduleTemplateComp = React.createClass({
    mixins: [getJsonLoaderMixin('/futuintro/api/scheduletemplates/', 'scheduleTemplates')],
    getInitialState: function() {
        return {};
    },
    componentWillMount: function() {
        if (this.dataLoaded) {
            return;
        }
        $.ajax({
            url: '/futuintro/api/scheduletemplates/',
            success: (function(data) {
                this.setState({dataLoaded: true});
                console.log(data);
            }).bind(this),
            error: function(req, txtStatus, txtErr) {
                console.error('Failed:', req, txtStatus, txtErr);
            }
        });
    },
    render: function() {
        if (!this.state.scheduleTemplatesLoaded) {
            return <div>Waiting for data</div>;
        }
        return <div>{this.state.scheduleTemplates.length} Schedule Templates</div>;
    }
});


var TimeZoneListComp = React.createClass({
    getInitialState: function() {
        console.log('TZ get inital state');
        return {};
    },
    componentWillMount: function() {
        console.log('TZ will mount');
    },
    propTypes: {
        timezones: React.PropTypes.array.isRequired
    },
    getDefaultProps: function() {
        return {
            timezones: []
        };
    },
    render: function() {
        return <span>There are {this.props.timezones.length} timezones.</span>;
    }
});

var UpdatingTimeZoneList = React.createClass({
    propTypes: {
        updateInterval: React.PropTypes.number
    },
    getDefaultProps: function() {
        return {
            updateInterval: 2000
        };
    },
    getInitialState: function() {
        return {
            items: []
        };
    },
    update: function(otherInterval) {
        var self = this, items = [], nextUrl = '/futuintro/api/timezones/';
        function fetch() {
            if (nextUrl) {
                $.ajax({
                    url: nextUrl,
                    success: (function(data) {
                        items = items.concat(data.results);
                        nextUrl = data.next;
                        fetch();
                    }),
                    error: function(req, txtStatus, txtErr) {
                        console.error('Failed:', req, txtStatus, txtErr);
                        self.update();
                    }
                });
            } else {
                self.setState({
                    items: items
                });
                self.update();
            }
        }

        var interval = this.props.updateInterval;
        if (otherInterval !== undefined) {
            interval = otherInterval;
        }
        this.timerId = setTimeout(fetch, interval);
    },
    componentDidMount: function() {
        this.update(0);
    },
    componentWillUnmount: function() {
        clearTimeout(this.timerId);
    },
    render: function() {
        return <TimeZoneListComp timezones={this.state.items} />;
    }
});
