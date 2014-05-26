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


/*
 * Fetches the data when initially created.
 */
var FetchingTimeZoneList = React.createClass({
    getInitialState: function() {
        return {
            doneFetching: false,
            hasErr: false,
            items: []
        };
    },
    componentDidMount: function() {
        var self = this, items = [], nextUrl = '/futuintro/api/timezones/';
        function fetch() {
            if (nextUrl) {
                $.ajax({
                    url: nextUrl,
                    success: (function(data) {
                        items = items.concat(data.results);
                        nextUrl = data.next;
                        self.timerId = setTimeout(fetch, 0);
                    }),
                    error: function(req, txtStatus, txtErr) {
                        console.error('Failed:', req, txtStatus, txtErr);
                        self.setState({
                            doneFetching: true,
                            hasErr: true
                        });
                    }
                });
            } else {
                self.setState({
                    doneFetching: true,
                    items: items
                });
            }
        }

        // so we can cancel the timer if the component is unmounted
        // while we're still processing requests.
        this.timerId = setTimeout(fetch, 0);
    },
    componentWillUnmount: function() {
        clearTimeout(this.timerId);
    },
    onDelete: function(deletedItem) {
        // non-optimal O(n) operation
        var itemsLeft = this.state.items.filter(function(item) {
            return item.id != deletedItem.id;
        });
        this.setState({
            items: itemsLeft
        });
    },
    render: function() {
        if (!this.state.doneFetching) {
            return <div>Getting data…</div>;
        }
        if (this.state.hasErr) {
            return <div>There was an error getting data</div>;
        }
        return <TimeZoneListComp timezones={this.state.items}
                onDelete={this.onDelete} />;
    }
});

/*
 * Requires you to pass the data in an attribute.
 */
var TimeZoneListComp = React.createClass({
    propTypes: {
        timezones: React.PropTypes.array.isRequired,
        onDelete: React.PropTypes.func
    },
    getDefaultProps: function() {
        return {
            timezones: [],
            onDelete: function() {
            }
        };
    },
    render: function() {
        function createTimezoneComp(tz) {
            return <li>
                    <TimeZoneComp
                        // if you omit the key, weird things happen on Delete
                        // probably because of how ‘reconciliation’ works.
                        key={tz.id}
                        tz={tz}
                        onDelete={this.props.onDelete}
                    />
                </li>;
        }
        return <ul>{this.props.timezones.map(createTimezoneComp, this)}</ul>;
    }
});

/*
 * Display, edit and delete a TimeZone.
 *
 * After deleting, onDelete({id: the_id}) is called.
 */
var TimeZoneComp = React.createClass({
    propTypes: {
        tz: React.PropTypes.object.isRequired,
        onDelete: React.PropTypes.func
    },
    getDefaultProps: function() {
        return {
            onDelete: function() {
            }
        };
    },
    getInitialState: function() {
        return {
            id: this.props.tz.id,
            name: this.props.tz.name,

            // If non-empty, an AJAX request is in flight and this is its
            // description, e.g. ‘Saving…’.
            reqInFlight: '',
            // If non-empty, the previous request had an error and this is a
            // text to show the user.
            reqErr: '',

            editing: false,
            deleted: false
        };
    },
    edit: function() {
        this.setState({
            editing: true,
            newName: this.state.name,
            reqErr: '',
        });
    },
    handleChange: function(event) {
        this.setState({
            newName: event.target.value
        });
    },
    cancelEdit: function() {
        this.setState({
            editing: false,
            reqErr: ''
        });
    },
    save: function(evt) {
        evt.preventDefault();
        this.setState({
            reqInFlight: 'Saving…'
        });

        // TODO: remove the setTimeout (tests delays in DEV).
        setTimeout((function() {
        $.ajax({
            url: '/futuintro/api/timezones/' + this.state.id + '/',
            type: 'PUT',
            contentType: 'application/json; charset=UTF-8',
            headers: {
                'X-CSRFToken': $.cookie('csrftoken')
            },
            data: JSON.stringify({
                name: this.state.newName
            }),
            complete: (function(data) {
                this.setState({
                    reqInFlight: ''
                });
            }).bind(this),
            success: (function(data) {
                this.setState({
                    name: this.state.newName,
                    reqErr: '',
                    editing: false
                });
            }).bind(this),
            error: (function(xhr, txtStatus, saveErr) {
                console.log('error', xhr, txtStatus, saveErr);
                var errTxt = 'Error';
                if (xhr.responseText) {
                    try {
                        // JSON response is an explanation of the problem.
                        // Anything else is probably a huge html page
                        // describing server misconfiguration.
                        errTxt += ': ' + JSON.stringify(
                            JSON.parse(xhr.responseText));
                    } catch (exc) {
                        // json parsing
                    }
                }

                this.setState({
                    reqErr: errTxt
                });
            }).bind(this)
        });
        }).bind(this), 3000);
    },
    delete: function() {
        this.setState({
            reqInFlight: 'Deleting…'
        });

        // TODO: remove the setTimeout (tests delays in DEV).
        setTimeout((function() {
        $.ajax({
            url: '/futuintro/api/timezones/' + this.state.id + '/',
            type: 'DELETE',
            headers: {
                'X-CSRFToken': $.cookie('csrftoken')
            },
            complete: (function(data) {
                this.setState({
                    reqInFlight: ''
                });
            }).bind(this),
            success: (function(data) {
                // Game-over. We don't care about any other state fields.
                this.setState({
                    deleted: true,
                    reqErr: ''
                });
                this.props.onDelete({
                    id: this.state.id
                });
            }).bind(this),
            error: (function(xhr, txtStatus, delErr) {
                console.log('error', xhr, txtStatus, delErr);
                var errTxt = 'Error';
                if (xhr.responseText) {
                    try {
                        errTxt += ': ' + JSON.stringify(
                            JSON.parse(xhr.responseText));
                    } catch (exc) {
                        // json parsing
                    }
                }

                this.setState({
                    reqErr: errTxt
                });
            }).bind(this)
        });
        }).bind(this), 3000);
    },
    render: function() {
        var statusBox;

        if (this.state.deleted) {
            return <div>This TimeZone has been deleted.
                You should not be seeing this.</div>;
        }

        if (this.state.reqInFlight || this.state.reqErr) {
            statusBox = <span
                    className={'status-' + (this.state.reqInFlight ? 'info' : 'error')}>
                    {this.state.reqInFlight ? this.state.reqInFlight : this.state.reqErr }
                </span>;
        }

        if (!this.state.editing) {
            return <div>
                    {this.state.name}
                    <button type="button"
                        onClick={this.edit}
                        disabled={this.state.reqInFlight}>Edit</button>
                    <button type="button"
                        onClick={this.delete}
                        disabled={this.state.reqInFlight}>Delete</button>
                    {statusBox}
                </div>;
        }

        return <form onSubmit={this.save}>
                <input type="text"
                    value={this.state.newName}
                    onChange={this.handleChange}
                    disabled={this.state.reqInFlight} />
                <button type="button"
                    onClick={this.cancelEdit}
                    disabled={this.state.reqInFlight}>Cancel</button>
                <button type="submit"
                    disabled={this.state.reqInFlight}>Save</button>
                {statusBox}
            </form>;
    }
});
