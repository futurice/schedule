/** @jsx React.DOM */

var ScheduleTemplateDetail = React.createClass({
    propTypes: {
        id: React.PropTypes.number.isRequired
    },
    mixins: [
        getRestLoaderMixin('/futuintro/api/timezones/', 'timezones',
            'tzLoaded', 'tzErr'),
        getRestLoaderMixin('/futuintro/api/users/', 'users',
            'usersLoaded', 'usersErr'),
        getRestLoaderMixin('/futuintro/api/calendarresources/', 'rooms',
            'roomsLoaded', 'roomsErr'),
    ],
    componentDidMount: function() {
        compFetchRest.bind(this)(
            '/futuintro/api/eventtemplates/?scheduleTemplate=' + this.props.id,
            'evTempl', 'etLoaded', 'etErr',
            function() {
                this.setState({
                    editEvTempl: clone(this.state.evTempl),
                    evTemplAjaxErrors: this.state.evTempl.map(function() {
                        return '';
                    })
                });
            });

        compFetchItemRest.bind(this)(
            '/futuintro/api/scheduletemplates/' + this.props.id,
            'schedTempl', 'schedTemplErr',
            function() {
                this.setState({
                    editSchedTempl: clone(this.state.schedTempl)
                });
            });
    },
    getInitialState: function() {
        return {
            // Immutable models. These come from the server on initial load,
            // then on Create, Delete or Update operations.
            timezones: [],
            tzLoaded: false,
            tzErr: '',

            users: [],
            usersLoaded: false,
            usersErr: '',

            rooms: [],
            roomsLoaded: false,
            roomsErr: '',

            evTempl: [],
            etLoaded: false,
            etErr: '',

            schedTempl: null,
            schedTemplErr: '',

            // Mutable or ‘edit’ models. This is what the input fields change.
            // These start as a copy of the immutable models, and can be reset
            // back to them whenever we want.
            editSchedTempl: null,
            editEvTempl: null,
            // array with 1 item per event template, so we can print the error
            // next to the event that caused it.
            evTemplAjaxErrors: null,

            ajaxInFlight: '',
            ajaxErr: '',

            newEventSummary: ''
        };
    },
    // returns boolean telling if we have unsaved edits in the page
    hasUnsavedChanges: function() {
        return !sameModels(this.state.evTempl, this.state.editEvTempl);
    },
    createEventTemplate: function(ev) {
        ev.preventDefault();
        this.setState({
            ajaxInFlight: 'Creating…'
        });
        // TODO: remove the timeout
        setTimeout((function() {
        $.ajax({
            url: '/futuintro/api/eventtemplates/',
            type: 'POST',
            contentType: 'application/json; charset=UTF-8',
            headers: {'X-CSRFToken': $.cookie('csrftoken')},
            data: JSON.stringify({
                scheduleTemplate: this.props.id,
                summary: this.state.newEventSummary,
                // some sensible values for the remaining required fields
                dayOffset: 0,
                startTime: '10:00',
                endTime: '11:00'
            }),
            complete: (function(data) {
                this.isMounted() && this.setState({
                    ajaxInFlight: ''
                });
            }).bind(this),
            success: (function(data) {
                this.setState({
                    ajaxErr: '',

                    newEventSummary: '',

                    evTempl: this.state.evTempl.concat(data),
                    editEvTempl: this.state.editEvTempl.concat(data),
                    evTemplAjaxErrors: this.state.evTemplAjaxErrors.concat('')
                });
            }).bind(this),
            error: (function(xhr, txtStatus, saveErr) {
                this.setState({ajaxErr: getAjaxErr.apply(this, arguments)});
            }).bind(this)
        });
        }).bind(this), 1000);
    },
    getEditModelIdx: function(model) {
        var i, v = this.state.editEvTempl;
        for (i = 0; i < v.length; i++) {
            if (v[i] == model) {
                return i;
            }
        }
        return -1;
    },
    deleteEventTemplate: function(model) {
        var i = this.getEditModelIdx(model);
        if (i == -1) {
            console.error('Model to delete not found', model);
            return;
        }

        this.setState({
            ajaxInFlight: 'Deleting…'
        });
        // TODO: remove the timeout
        setTimeout((function() {
        $.ajax({
            url: '/futuintro/api/eventtemplates/' + model.id + '/',
            type: 'DELETE',
            headers: {'X-CSRFToken': $.cookie('csrftoken')},
            complete: (function(data) {
                this.isMounted() && this.setState({
                    ajaxInFlight: ''
                });
            }).bind(this),
            success: (function() {
                var evTempl = this.state.evTempl.concat(),
                    editEvTempl = this.state.editEvTempl.concat(),
                    evTemplAjaxErrors = this.state.evTemplAjaxErrors.concat();
                [evTempl, editEvTempl, evTemplAjaxErrors].forEach(function(a) {
                    a.splice(i, 1);
                });

                this.setState({
                    ajaxErr: '',

                    evTempl: evTempl,
                    editEvTempl: editEvTempl,
                    evTemplAjaxErrors: evTemplAjaxErrors
                });
            }).bind(this),
            error: (function(xhr, txtStatus, saveErr) {
                var errTxt = getAjaxErr.apply(this, arguments);
                var evTemplAjaxErrors = this.state.evTemplAjaxErrors.concat();
                evTemplAjaxErrors[i] = errTxt;

                this.setState({
                    ajaxErr: errTxt,
                    evTemplAjaxErrors: evTemplAjaxErrors
                });
            }).bind(this)
        });
        }).bind(this), 1000);
    },
    evTemplFieldEdit: function(model, fieldName, newValue) {
        var i = this.getEditModelIdx(model);
        if (i == -1) {
            console.error('Model not found', model);
            return;
        }

        var editEvTempl = clone(this.state.editEvTempl);
        editEvTempl[i][fieldName] = newValue;
        this.setState({
            editEvTempl: editEvTempl
        });
    },
    handleChangeNewEvent: function(ev) {
        this.setState({
            newEventSummary: ev.target.value
        });
    },
    render: function() {
        var v, i, fName;

        // check for error on initial load
        v = ['tzErr', 'usersErr', 'roomsErr', 'etErr', 'schedTemplErr'];
        for (i = 0; i < v.length; i++) {
            fName = v[i];
            if (this.state[fName]) {
                return <span className="status-error">
                    {this.state[fName]}
                </span>;
            }
        }

        // check if initial loading completed
        v = ['tzLoaded', 'usersLoaded', 'roomsLoaded', 'etLoaded',
          'schedTempl',
          'editEvTempl', 'evTemplAjaxErrors', 'editSchedTempl'];
        for (i = 0; i < v.length; i++) {
            fName = v[i];
            if (!this.state[fName]) {
                return <span className="status-info">Loading…</span>;
            }
        }

        // all loaded without errors

        var statusBox;
        if (this.state.ajaxInFlight || this.state.ajaxErr) {
            statusBox = <div className={'status-' +
                (this.state.ajaxInFlight ? 'info' : 'error')}>
                {this.state.ajaxInFlight || this.state.ajaxErr}
            </div>;
        }

        return (
            <div>
                <ul>
                {this.state.editEvTempl.map((function(et, i) {
                    return <li key={et.id}>
                        <EventTemplate
                            model={et}
                            rooms={this.state.rooms}
                            disabled={Boolean(this.state.ajaxInFlight)}
                            errTxt={this.state.evTemplAjaxErrors[i]}
                            onDelete={this.deleteEventTemplate}
                            onFieldEdit={this.evTemplFieldEdit}
                        />
                    </li>;
                }).bind(this))}
                </ul>

                <form id="add-event-template"
                    onSubmit={this.createEventTemplate}>
                    <label>Add an event template:</label>
                    <input type="text" placeholder="Event Summary…"
                        value={this.state.newEventSummary}
                        onChange={this.handleChangeNewEvent}
                        disabled={this.state.ajaxInFlight} />
                    <button type="submit" disabled={this.state.ajaxInFlight}>+ Add</button>
                </form>

                <div>
                    <button type="button"
                        disabled={this.state.ajaxInFlight ||
                            !this.hasUnsavedChanges()}
                        >
                        Save all changes
                    </button>
                    <span>
                        {this.hasUnsavedChanges() ?
                            'There are unsaved changes' :
                            'You haven\'t made any changes'}
                    </span>
                </div>

                {statusBox}
            </div>
        );
    }
});


var EventTemplate = (function() {
    return React.createClass({
        propTypes: {
            model: React.PropTypes.object.isRequired,
            rooms: React.PropTypes.array.isRequired,
            // disable all input fields and buttons, e.g. during the parent's
            // ajax requests
            disabled: React.PropTypes.bool.isRequired,
            errTxt: React.PropTypes.string.isRequired,
            // onDelete(model)
            onDelete: React.PropTypes.func.isRequired,
            // onFieldEdit(model, fieldName, newValue)
            onFieldEdit: React.PropTypes.func.isRequired
        },
        handleDelete: function() {
            this.props.onDelete(this.props.model);
        },
        handleChange: function(fieldName, ev) {
            var target = ev.target, val = target.value;
            switch (target.tagName) {
                case "SELECT":
                    // React treats <… someAttr={null|true|false|option} …>
                    // specially. So working around that.
                    if (val == 'null') {
                        val = null;
                    } else if (val == 'true') {
                        val = true;
                    } else if (val == 'false') {
                        val = false;
                    }
                    break;
                case "INPUT":
                    if (target.type == 'checkbox') {
                        val = target.checked;
                    }
                    break;
            }
            this.props.onFieldEdit(this.props.model, fieldName, val);
        },
        handleIntChange: function(fieldName, ev) {
            var val = Number.parseInt(ev.target.value) || 0;
            this.props.onFieldEdit(this.props.model, fieldName, val);
        },
        render: function() {
            var errBox;
            if (this.props.errTxt) {
                errBox = <div>
                    <span className="status-error">{this.props.errTxt}</span>
                </div>;
            }
            return <div>
                <label>Summary:</label>
                <input type="text"
                    disabled={this.props.disabled}
                    value={this.props.model.summary}
                    onChange={this.handleChange.bind(this, 'summary')}
                    />
                <br/>

                <label>Description:</label>
                <textarea
                    disabled={this.props.disabled}
                    value={this.props.model.description}
                    onChange={this.handleChange.bind(this, 'description')}
                    />
                <br/>

                <label>Location:</label>
                <select
                    disabled={this.props.disabled}
                    value={this.props.model.location === null ?
                        'null' : this.props.model.location}
                    onChange={this.handleChange.bind(this, 'location')}
                    >
                    <option value='null'>—</option>
                    {this.props.rooms.map(function(r) {
                        return <option key={r.id} value={r.id}>{r.name}</option>;
                    })}
                </select>
                <br/>

                <label>Day offset (TODO explain this):</label>
                <input type="number"
                    disabled={this.props.disabled}
                    value={this.props.model.dayOffset}
                    onChange={this.handleChange.bind(this, 'dayOffset')}
                    // If the user types 'hello' or '-' for '-3' only convert
                    // it to a number (0 for invalid strings) on blur
                    onBlur={this.handleIntChange.bind(this, 'dayOffset')}
                    />
                <br/>

                <label>From:</label>
                <input type="text"
                    disabled={this.props.disabled}
                    value={this.props.model.startTime}
                    onChange={this.handleChange.bind(this, 'startTime')}
                    />
                to
                <input type="text"
                    disabled={this.props.disabled}
                    value={this.props.model.endTime}
                    onChange={this.handleChange.bind(this, 'endTime')}
                    />
                <br/>

                <label>Event Type:</label>
                <select
                    disabled={this.props.disabled}
                    value={this.props.model.isCollective ? 'true' : 'false'}
                    onChange={this.handleChange.bind(this, 'isCollective')}
                    >
                    <option value='true'>
                        Common (invite all employees to the same event)
                    </option>
                    <option value='false'>
                        Individual (one separate event for each employee)
                    </option>
                </select>
                <br/>

                <input type="checkbox"
                    disabled={this.props.disabled}
                    checked={this.props.model.inviteEmployees}
                    onChange={this.handleChange.bind(this, 'inviteEmployees')}
                    />
                    Invite employee{this.props.model.isCollective ? 's' : ''}?
                <br/>

                <input type="checkbox"
                    disabled={this.props.disabled}
                    checked={this.props.model.inviteSupervisors}
                    onChange={this.handleChange.bind(this, 'inviteSupervisors')}
                    />
                    Invite supervisor{this.props.model.isCollective ? 's' : ''}?
                <br/>

                <button type="button"
                    onClick={this.handleDelete}
                    disabled={this.props.disabled}
                    >
                    Delete
                </button>
                {errBox}
            </div>;
        }
    });
})();
