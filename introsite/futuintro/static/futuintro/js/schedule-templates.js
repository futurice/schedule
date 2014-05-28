/** @jsx React.DOM */

var ScheduleTemplatesList = React.createClass({
    getInitialState: function() {
        return {
            schedTempl: [],
            schedTemplLoaded: false,
            schedTemplErr: '',

            timezones: [],
            tzLoaded: false,
            tzErr: '',

            // currently adding a new item
            addNew: false
        };
    },
    fetchData: function() {
        var f = compFetchRest.bind(this);
        f('/futuintro/api/scheduletemplates/', 'schedTempl',
            'schedTemplLoaded', 'schedTemplErr');
        f('/futuintro/api/timezones/', 'timezones',
            'tzLoaded', 'tzErr');
    },
    refresh: function() {
        this.setState(this.getInitialState());
        this.fetchData();
    },
    componentDidMount: function() {
        this.fetchData();
    },
    toggleAddNew: function() {
        var addNew = !this.state.addNew;
        var schedTempl;
        if (addNew) {
            schedTempl = this.state.schedTempl.concat({id: null});
        } else {
            schedTempl = this.state.schedTempl.slice(0, -1);
        }
        this.setState({
            addNew: addNew,
            schedTempl: schedTempl
        });
    },
    onDelete: function(obj) {
        this.setState({
            schedTempl: this.state.schedTempl.filter(function(st) {
                return st.id != obj.id;
            })
        });
    },
    render: function() {
        if (this.state.schedTemplErr || this.state.tzErr) {
            return (
                <div>{this.state.schedTemplErr || this.state.tzErr}</div>
            );
        }

        if (!(this.state.schedTemplLoaded && this.state.tzLoaded)) {
            return <div>Loading…</div>;
        }

        return <div>
            <ul>
            {this.state.schedTempl.map((function(st) {
                return <li key={'' + st.id}>
                    <ScheduleTemplateSummary
                        data={st}
                        allTimezones={this.state.timezones}
                        onCancelNew={this.toggleAddNew}
                        onCreateNew={this.refresh}
                        onDelete={this.onDelete}
                        />
                </li>;
            }).bind(this))}
            </ul>
            <button type="button" onClick={this.toggleAddNew}
                hidden={this.state.addNew}>+ Add</button>
        </div>;
    }
});

var ScheduleTemplateSummary = React.createClass({
    propTypes: {
        // the json for a ‘schedule template’ object.
        // Our hacky convention: if .id is null, we're creating a new object.
        data: React.PropTypes.object.isRequired,
        allTimezones: React.PropTypes.array.isRequired,

        onCancelNew: React.PropTypes.func.isRequired,
        onCreateNew: React.PropTypes.func.isRequired,
        // onDelete({id: item_id})
        onDelete: React.PropTypes.func.isRequired
    },
    getInitialState: function() {
        return {
            deleted: false,
            canceled: false,
            newItemCreated: false,
            ajaxInFlight: '',
            ajaxErr: ''
        };
    },
    getTimezoneName: function(tzId) {
        for (var i = 0; i < this.props.allTimezones.length; i++) {
            var crt = this.props.allTimezones[i];
            if (crt.id == tzId) {
                return crt.name;
            }
        }
        console.log('Unknown timezone ID', tzId);
        return 'UNKONWN!';
    },
    delete: function() {
        if (!confirm('Delete this Schedule Template ' +
                    'and all its Event Templates?')) {
            return;
        }

        this.setState({
            ajaxInFlight: 'Deleting…'
        });

        // TODO: remove the setTimeout (tests delays in DEV).
        setTimeout((function() {
        $.ajax({
            url: '/futuintro/api/scheduletemplates/' + this.props.data.id + '/',
            type: 'DELETE',
            headers: {
                'X-CSRFToken': $.cookie('csrftoken')
            },
            complete: (function(data) {
                this.isMounted() && this.setState({
                    ajaxInFlight: ''
                });
            }).bind(this),
            success: (function(data) {
                // Game-over. We don't care about any other state fields.
                this.setState({
                    deleted: true
                });
                this.props.onDelete({
                    id: this.props.data.id
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
                        // json parsing error
                    }
                }

                this.setState({
                    ajaxErr: errTxt
                });
            }).bind(this)
        });
        }).bind(this), 2000);
    },
    cancel: function() {
        this.setState({
            canceled: true
        });
        this.props.onCancelNew();
    },
    submit: function(evt) {
        evt.preventDefault();
        this.setState({
            ajaxInFlight: 'Saving…'
        });

        // TODO: remove the setTimeout (tests delays in DEV).
        setTimeout((function() {
        $.ajax({
            url: '/futuintro/api/scheduletemplates/',
            type: 'POST',
            contentType: 'application/json; charset=UTF-8',
            headers: {
                'X-CSRFToken': $.cookie('csrftoken')
            },
            data: JSON.stringify({
                name: this.refs.name.getDOMNode().value.trim(),
                timezone: this.refs.tz.getDOMNode().value
            }),
            complete: (function(data) {
                this.isMounted() && this.setState({
                    ajaxInFlight: ''
                });
            }).bind(this),
            success: (function(data) {
                // Game-over. Parent must handle from here.
                this.setState({
                    newItemCreated: true
                });
                this.props.onCreateNew();
            }).bind(this),
            error: (function(xhr, txtStatus, saveErr) {
                console.log('error', xhr, txtStatus, saveErr);
                var errTxt = 'Error';
                if (xhr.responseText) {
                    try {
                        errTxt += ': ' + JSON.stringify(
                            JSON.parse(xhr.responseText));
                    } catch (exc) {
                        // json parsing error
                    }
                }

                this.setState({
                    ajaxErr: errTxt
                });
            }).bind(this)
        });
        }).bind(this), 2000);
    },
    render: function() {
        var statusBox;
        if (this.state.ajaxInFlight || this.state.ajaxErr) {
            statusBox = <span
                className={'status-' +
                    (this.state.ajaxInFlight ? 'info' : 'error')}>
                {this.state.ajaxInFlight || this.state.ajaxErr}
            </span>;
        }

        // existing item
        if (this.props.data.id != null) {
            if (this.state.deleted) {
                return <span>Deleted. Parent component should remove us.</span>;
            }

            return <div>
                {this.props.data.name} {' '}
                ({this.getTimezoneName(this.props.data.timezone)})
                <button type="button"
                    onClick={this.delete}
                    disabled={this.state.ajaxInFlight}>
                    Delete
                </button>
                {statusBox}
            </div>;
        }

        // adding a new item
        if (this.state.canceled) {
            return <span>Canceled. Parent component should remove us.</span>;
        }
        if (this.state.newItemCreated) {
            return <span>New Item Created.
                Parent component should take over.</span>;
        }

        return <form onSubmit={this.submit}>
            <input type="text" ref="name"
                placeholder="Name of this Schedule Template…"
                disabled={this.state.ajaxInFlight} />
            <select ref="tz" disabled={this.state.ajaxInFlight}>
                {this.props.allTimezones.map(function(tz) {
                    // Don't need the key here, just silencing React warning
                    return <option key={tz.id} value={tz.id}>{tz.name}</option>;
                })}
            </select>
            <button type="submit" disabled={this.state.ajaxInFlight}>
                Save
            </button>
            <button type="button"
                onClick={this.cancel}
                disabled={this.state.ajaxInFlight}>
                Cancel
            </button>

            {statusBox}
        </form>;
    }
});
