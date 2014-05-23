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
