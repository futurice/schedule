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

            calendars: [],
            calLoaded: false,
            calErr: ''
        };
    },
    fetchData: function() {
        var f = compFetchRest.bind(this);
        f(apiRoot + 'scheduletemplates/?ordering=name', 'schedTempl',
            'schedTemplLoaded', 'schedTemplErr');
        f(apiRoot + 'timezones/?ordering=name', 'timezones',
            'tzLoaded', 'tzErr');
        f(apiRoot + 'calendars/?ordering=email', 'calendars',
            'calLoaded', 'calErr');
    },
    refresh: function() {
        this.setState(this.getInitialState());
        this.fetchData();
    },
    componentDidMount: function() {
        this.fetchData();
    },
    onDelete: function(deletedObj) {
        this.setState({
            schedTempl: this.state.schedTempl.filter(function(st) {
                return st.id != deletedObj.id;
            })
        });
    },
    onCreate: function(createdObj) {
        this.setState({
            schedTempl: this.state.schedTempl.concat(createdObj)
        });
    },
    onUpdate: function(newObj) {
        this.setState({
            schedTempl: this.state.schedTempl.map(function(st) {
                if (st.id == newObj.id) {
                    return newObj;
                }
                return st;
            })
        });
    },
    render: function() {
        var errTxt;
        ['schedTemplErr', 'tzErr', 'calErr'].forEach(function(f) {
            errTxt = errTxt || this.state[f];
        }, this);
        if (errTxt) {
            return <div>
                <span className="status-error">{errTxt}</span>
            </div>;
        }

        var loaded = true;
        ['schedTemplLoaded', 'tzLoaded', 'calLoaded'].forEach(function(f) {
            loaded = loaded && this.state[f];
        }, this);
        if (!loaded) {
            return <div>
                <span className="status-waiting">Loading…</span>
            </div>;
        }

        return <div>
            {this.state.schedTempl.length ? '' :
                <span className="info">
                    There are no Schedule Templates.
                </span>}
            <ul id="schedule-template-list">
                {this.state.schedTempl.map((function(st) {
                    return <li key={st.id || 'add-new-st-item'}>
                        <ScheduleTemplateSummary
                            model={st}
                            allTimezones={this.state.timezones}
                            allCalendars={this.state.calendars}
                            onDelete={this.onDelete}
                            onUpdate={this.onUpdate}
                            />
                    </li>;
                }).bind(this))}
                <li>
                    <ScheduleTemplateSummary
                        model={null}
                        allTimezones={this.state.timezones}
                        allCalendars={this.state.calendars}
                        onCreate={this.onCreate}
                        />
                </li>
            </ul>
        </div>;
    }
});

/*
 * Display, edit and delete a ScheduleTemplate, or create a new one.
 *
 * The model is either a plain JS object to display, edit or delete an item
 * or null to show a form for creating a new one.
 */
var ScheduleTemplateSummary = React.createClass({
    mixins: [
        getPropModelClonerMixin({
            id: null,
            name: '',
            timezone: null,
            calendar: null
        }),
    ],
    propTypes: {
        model: React.PropTypes.object,
        allTimezones: React.PropTypes.array.isRequired,
        allCalendars: React.PropTypes.array.isRequired,

        onCreate: React.PropTypes.func,
        onUpdate: React.PropTypes.func,
        onDelete: React.PropTypes.func
    },
    getInitialState: function() {
        var state = {
            // for existing items: nothing to display anymore
            deleted: false,

            ajaxInFlight: '',
            ajaxErr: '',

            editing: this.isNewItem()
        };
        if (state.editing) {
            // mutable model used only in edit mode
            // and reset every time we enter edit mode.
            state.editModel = this.copyInitialModel();
        }
        return state;
    },
    edit: function() {
        this.setState({
            editing: true,
            // reset the editModel every time we enter edit mode
            editModel: this.copyInitialModel(),
            ajaxErr: '',
        });
    },
    cancelEdit: function() {
        this.setState({
            editing: false,
            ajaxErr: ''
        });
    },
    handleChange: function(modelFieldName, convertToInt, event) {
        var val = getTargetValue(event);
        if (convertToInt && typeof(val) == 'string') {
            val = Number.parseInt(val) || 0;
        }

        var m = clone(this.state.editModel);
        m[modelFieldName] = val;
        this.setState({
            editModel: m
        });
    },
    saveOrCreate: function(evt) {
        evt.preventDefault();
        this.setState({
            ajaxInFlight: this.isNewItem() ? 'Creating…' : 'Saving…'
        });

        var url;
        if (this.isNewItem()) {
            url = apiRoot + 'scheduletemplates/';
        } else {
            url = apiRoot + 'scheduletemplates/' + this.props.model.id + '/';
        }

        $.ajax({
            url: url,
            type: this.isNewItem() ? 'POST' : 'PUT',
            contentType: 'application/json; charset=UTF-8',
            headers: {
                'X-CSRFToken': $.cookie('csrftoken')
            },
            data: JSON.stringify(this.state.editModel),
            complete: (function(data) {
                this.isMounted() && this.setState({
                    ajaxInFlight: ''
                });
            }).bind(this),
            success: (function(data) {
                if (this.isNewItem()) {
                    this.props.onCreate(data);
                    this.setState(this.getInitialState());
                    return;
                }
                this.props.onUpdate(data);
                this.setState({
                    ajaxErr: '',
                    editing: false
                });
            }).bind(this),
            error: (function(xhr, txtStatus, saveErr) {
                this.setState({ajaxErr: getAjaxErr.apply(this, arguments)});
            }).bind(this)
        });
    },
    delete: function() {
        if (!confirm('Delete “' + this.props.model.name +
                    '” and all its event templates?')) {
            return;
        }

        this.setState({
            ajaxInFlight: 'Deleting…'
        });

        $.ajax({
            url: apiRoot + 'scheduletemplates/' + this.props.model.id + '/',
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
                this.props.onDelete(this.props.model);
                // Game-over. We don't care about any other state fields.
                this.isMounted() && this.setState({
                    deleted: true,
                });
            }).bind(this),
            error: (function(xhr, txtStatus, delErr) {
                this.setState({ajaxErr: getAjaxErr.apply(this, arguments)});
            }).bind(this)
        });
    },

    render: function() {
        var statusBox;

        if (this.state.deleted) {
            return <div>Deleted.</div>;
        }
        if (this.state.ajaxInFlight || this.state.ajaxErr) {
            statusBox = <span
                className={'status-' +
                    (this.state.ajaxInFlight ? 'waiting' : 'error')}>
                {this.state.ajaxInFlight || this.state.ajaxErr}
            </span>;
        }

        if (!this.state.editing) {
            return <div>
                <a href={'../schedule-template/' + this.props.model.id}>
                    {(function() {
                        var tzName = 'Unknown TimeZone';
                        this.props.allTimezones.forEach(function(tz) {
                            if (tz.id == this.props.model.timezone) {
                                tzName = tz.name;
                            }
                        }, this);
                        var calEmail = 'Unknown Calendar';
                        this.props.allCalendars.forEach(function(cal) {
                            if (cal.id == this.props.model.calendar) {
                                calEmail = cal.email;
                            }
                        }, this);
                        return this.props.model.name +
                            ' (' + tzName + ', ' + calEmail + ')';
                    }).bind(this)()}
                </a>
                <button type="button"
                    onClick={this.edit}
                    disabled={this.state.ajaxInFlight}>
                    Edit
                </button>
                <button type="button"
                    onClick={this.delete}
                    disabled={this.state.ajaxInFlight}>
                    Delete
                </button>
                {statusBox}
            </div>;
        }

        return <form onSubmit={this.saveOrCreate}>
            <input type="text"
                placeholder="Template Name…"
                value={this.state.editModel.name}
                onChange={this.handleChange.bind(this, 'name', false)}
                disabled={this.state.ajaxInFlight}
                />
            <select
                value={this.state.editModel.timezone || 'null'}
                onChange={this.handleChange.bind(this, 'timezone', true)}
                disabled={this.state.ajaxInFlight}
                >
                <option value='null'>TimeZone…</option>
                {this.props.allTimezones.map(function(tz) {
                    // Don't need the key here, just silencing React warning
                    return <option key={tz.id} value={tz.id}>{tz.name}</option>;
                })}
            </select>
            <select
                value={this.state.editModel.calendar || 'null'}
                onChange={this.handleChange.bind(this, 'calendar', true)}
                disabled={this.state.ajaxInFlight}
                >
                <option value='null'>Calendar…</option>
                {this.props.allCalendars.map(function(cal) {
                    // Don't need the key here, just silencing React warning
                    return <option key={cal.id} value={cal.id}>
                        {cal.email}
                    </option>;
                })}
            </select>
            <button type="submit" disabled={this.state.ajaxInFlight}>
                {this.isNewItem() ? 'Add new' : 'Save'}
            </button>
            <button type="button"
                onClick={this.cancelEdit}
                disabled={this.state.ajaxInFlight}
                hidden={this.isNewItem()}
                >
                Cancel
            </button>
            <button type="reset"
                disabled={this.state.ajaxInFlight}
                hidden={!this.isNewItem()}
                >
                Clear fields
            </button>

            {this.isNewItem() ? <br/> : ''}
            {statusBox}
        </form>;
    }
});
