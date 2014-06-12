/** @jsx React.DOM */

var ScheduleTemplateDetail = React.createClass({
    propTypes: {
        id: React.PropTypes.number.isRequired
    },
    mixins: [
        getRestLoaderMixin('/futuintro/api/timezones/', 'timezones',
            'tzLoaded', 'tzErr'),
        getRestLoaderMixin('/futuintro/api/users/?ordering=first_name,last_name',
            'users', 'usersLoaded', 'usersErr',
            function() {
                var usersById = {};
                this.state.users.forEach(function(u) {
                    usersById[u.id] = u;
                });

                var userTextById = {};
                this.state.users.forEach(function(u) {
                    userTextById[u.id] = u.first_name + ' ' + u.last_name
                            + ' (' + u.email + ')';
                });

                var alphabeticalUserIds = Object.keys(userTextById);
                alphabeticalUserIds.sort(function(a, b) {
                    a = userTextById[a].toLowerCase();
                    b = userTextById[b].toLowerCase();
                    if (a == b) {
                        return 0;
                    }
                    if (a < b) {
                        return -1;
                    }
                    return 1;
                });

                this.setState({
                    usersById: usersById,
                    userTextById: userTextById,
                    alphabeticalUserIds: alphabeticalUserIds
                });
            }),
        getRestLoaderMixin('/futuintro/api/calendarresources/', 'rooms',
            'roomsLoaded', 'roomsErr',
            function() {
                this.setState({
                    roomMSModel: makeRoomMultiSelectModel(this.state.rooms)
                });
            }),
    ],
    componentDidMount: function() {
        compFetchRest.bind(this)(
            '/futuintro/api/eventtemplates/?scheduleTemplate=' + this.props.id,
            'evTempl', 'etLoaded', 'etErr',
            function() {
                // drop seconds. 11:00:00 → 11:00, 08:00:00 → 8:00
                var newEvTempl = this.state.evTempl.map(function(x) {
                    x = clone(x);
                    ['startTime', 'endTime'].forEach(function(fName) {
                        x[fName] = dropSeconds(x[fName]);
                    });
                    return x;
                });

                this.setState({
                    evTempl: newEvTempl,
                    editEvTempl: clone(newEvTempl),
                    evTemplAjaxErrors: newEvTempl.map(function() {
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
            // Computed fields
            usersById: null,            // [user-obj1, …]
            userTextById: null,         // {id1: 'name and email', …}
            alphabeticalUserIds: null,  // [id1, id2, …] ordered by user name

            rooms: [],
            roomsLoaded: false,
            roomsErr: '',
            // model for the MultiSelect
            roomMSModel: null,

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
        return !sameModels(this.state.editSchedTempl, this.state.schedTempl)
            || !sameModels(this.state.evTempl, this.state.editEvTempl);
    },
    createEventTemplate: function(ev) {
        ev.preventDefault();
        this.setState({
            ajaxInFlight: 'Creating…'
        });
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
                ['startTime', 'endTime'].forEach(function(fName) {
                    data[fName] = dropSeconds(data[fName]);
                });

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
    },
    schedTemplFieldEdit: function(fieldName, newValue) {
        var editSchedTempl = clone(this.state.editSchedTempl);
        editSchedTempl[fieldName] = newValue;
        this.setState({
            editSchedTempl: editSchedTempl
        });
    },
    handleSchedTemplateChange: function(fieldName, convertToInt, ev) {
        var val = ev.target.value;
        if (convertToInt && typeof(val) == 'string') {
            val = Number.parseInt(val) || 0;
        }
        this.schedTemplFieldEdit(fieldName, val);
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
    undoChanges: function() {
        this.setState({
            editSchedTempl: clone(this.state.schedTempl),
            editEvTempl: clone(this.state.evTempl)
        });
    },
    saveAll: function() {
        // save the Schedule template, then each event template
        var eventTemplIndex;

        var saveSchedTemplate = (function() {
            this.setState({
                ajaxInFlight: 'Saving the Schedule Template…'
            });

            $.ajax({
                url: '/futuintro/api/scheduletemplates/'
                    + this.state.editSchedTempl.id + '/',
                type: 'PUT',
                contentType: 'application/json; charset=UTF-8',
                headers: {'X-CSRFToken': $.cookie('csrftoken')},
                data: JSON.stringify(this.state.editSchedTempl),
                success: (function(data) {
                    this.setState({
                        ajaxErr: '',
                        schedTempl: clone(data),
                        editSchedTempl: clone(data)
                    });

                    eventTemplIndex = 0;
                    saveNextEventTemplate();
                }).bind(this),
                error: (function(xhr, txtStatus, saveErr) {
                    this.setState({
                        ajaxInFlight: '',
                        ajaxErr: getAjaxErr.apply(this, arguments)
                    })
                }).bind(this)
            });
        }).bind(this);

        var saveNextEventTemplate = (function () {
            if (eventTemplIndex == this.state.editEvTempl.length) {
                this.setState({
                    ajaxInFlight: ''
                });
                return;
            }
            this.setState({
                ajaxInFlight: 'Saving Event ' + (eventTemplIndex+1)
                    + ' of ' + this.state.editEvTempl.length
            });
            var evTemplAjaxErrors = clone(this.state.evTemplAjaxErrors);

            $.ajax({
                url: '/futuintro/api/eventtemplates/'
                    + this.state.editEvTempl[eventTemplIndex].id + '/',
                type: 'PUT',
                contentType: 'application/json; charset=UTF-8',
                headers: {'X-CSRFToken': $.cookie('csrftoken')},
                data: JSON.stringify(this.state.editEvTempl[eventTemplIndex]),
                success: (function(data) {
                    ['startTime', 'endTime'].forEach(function(fName) {
                        data[fName] = dropSeconds(data[fName]);
                    });

                    evTemplAjaxErrors[eventTemplIndex] = '';

                    var evTempl = clone(this.state.evTempl);
                    evTempl[eventTemplIndex] = clone(data);

                    var editEvTempl = clone(this.state.editEvTempl);
                    editEvTempl[eventTemplIndex] = clone(data);

                    this.setState({
                        ajaxErr: '',
                        evTempl: evTempl,
                        editEvTempl: editEvTempl,
                        evTemplAjaxErrors: evTemplAjaxErrors
                    });

                    eventTemplIndex++;
                    saveNextEventTemplate();
                }).bind(this),
                error: (function(xhr, txtStatus, saveErr) {
                    var errTxt = getAjaxErr.apply(this, arguments);
                    evTemplAjaxErrors[eventTemplIndex] = errTxt;
                    this.setState({
                        ajaxInFlight: '',
                        ajaxErr: errTxt,
                        evTemplAjaxErrors: evTemplAjaxErrors
                    })
                }).bind(this)
            });
        }).bind(this);

        saveSchedTemplate();
    },
    render: function() {
        var v, i, fName;

        // check for error on initial load
        v = ['tzErr', 'usersErr', 'roomsErr', 'etErr', 'schedTemplErr'];
        for (i = 0; i < v.length; i++) {
            fName = v[i];
            if (this.state[fName]) {
                return <div>
                    <span className="status-error">
                        {this.state[fName]}
                    </span>
                </div>;
            }
        }

        // check if initial loading completed
        v = ['tzLoaded', 'usersLoaded', 'roomsLoaded', 'etLoaded',
          'schedTempl',
          'usersById', 'userTextById', 'alphabeticalUserIds', 'roomMSModel',
          'editEvTempl', 'evTemplAjaxErrors', 'editSchedTempl'];
        for (i = 0; i < v.length; i++) {
            fName = v[i];
            if (!this.state[fName]) {
                return <div>
                    <span className="status-waiting">Loading…</span>
                </div>;
            }
        }

        // all loaded without errors

        var hasUnsavedChanges = this.hasUnsavedChanges();

        var makeSaveBox = (function() {
            var statusBox;
            if (this.state.ajaxInFlight || this.state.ajaxErr) {
                statusBox = <div>
                    <span className={'status-' +
                        (this.state.ajaxInFlight ? 'waiting' : 'error')}>
                        {this.state.ajaxInFlight || this.state.ajaxErr}
                    </span>
                </div>;
            }

            return <div className="schedule-template-status">
                <span className={hasUnsavedChanges ? 'warn' : 'info'}>
                    {hasUnsavedChanges ?
                        'There are unsaved changes' :
                        'You haven\'t made any changes'}
                </span>
                <br/>
                <button type="button"
                    disabled={this.state.ajaxInFlight ||
                        !hasUnsavedChanges}
                    onClick={this.saveAll}
                    >
                    Save all changes
                </button>
                <button type="button"
                    disabled={this.state.ajaxInFlight ||
                        !hasUnsavedChanges}
                    onClick={this.undoChanges}
                    >
                    Undo changes
                </button>

                {statusBox}
            </div>;
        }).bind(this);

        return <div>
            {makeSaveBox()}

            <div id="schedule-template-fields">
                <h1>Schedule Template</h1>
                <table>
                <tr>
                    <td>
                        <label>Name:</label>
                    </td>
                    <td>
                        <input type="text"
                            value={this.state.editSchedTempl.name}
                            disabled={Boolean(this.state.ajaxInFlight)}
                            onChange={this.handleSchedTemplateChange.bind(
                                    this, 'name', false)}
                        />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>TimeZone:</label>
                    </td>
                    <td>
                        <select
                            value={this.state.editSchedTempl.timezone}
                            disabled={Boolean(this.state.ajaxInFlight)}
                            onChange={this.handleSchedTemplateChange.bind(
                                    this, 'timezone', true)}
                            >
                            {this.state.timezones.map(function(tz) {
                                return <option key={tz.id} value={tz.id}>
                                    {tz.name}
                                </option>;
                            })}
                        </select>
                    </td>
                </tr>
                </table>
            </div>

            <div id="event-templates-container">
                <h1>Event Templates</h1>
                {this.state.editEvTempl.length ? '' :
                    <span className="info">There are no event templates</span>}

                <ul id="event-templates-list">
                    {this.state.editEvTempl.map((function(et, i) {
                        return <li key={et.id} className="event-template">
                            <EventTemplate
                                model={et}
                                userTextById={this.state.userTextById}
                                alphabeticalUserIds={this.state.alphabeticalUserIds}
                                roomMSModel={this.state.roomMSModel}
                                disabled={Boolean(this.state.ajaxInFlight)}
                                errTxt={this.state.evTemplAjaxErrors[i]}
                                onDelete={this.deleteEventTemplate}
                                onFieldEdit={this.evTemplFieldEdit}
                            />
                        </li>;
                    }).bind(this))}

                    <li>
                        <form id="add-event-template"
                            onSubmit={this.createEventTemplate}>
                            <label>Add an event template:</label>
                            <input type="text" placeholder="Event Summary…"
                                value={this.state.newEventSummary}
                                onChange={this.handleChangeNewEvent}
                                disabled={this.state.ajaxInFlight} />
                            <button type="submit"
                                disabled={this.state.ajaxInFlight}>
                                + Add
                            </button>
                        </form>
                    </li>
                </ul>
            </div>

            {makeSaveBox()}
        </div>;
    }
});


var EventTemplate = (function() {
    var EventTemplate = React.createClass({
        propTypes: {
            model: React.PropTypes.object.isRequired,

            // needed by <MultiSelect/>
            userTextById: React.PropTypes.object.isRequired,
            alphabeticalUserIds: React.PropTypes.array.isRequired,

            roomMSModel: React.PropTypes.object.isRequired,
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
        handleChange: function(fieldName, convertToInt, ev) {
            var val = getTargetValue(ev);
            if (convertToInt && typeof(val) == 'string') {
                val = Number.parseInt(val) || 0;
            }
            this.props.onFieldEdit(this.props.model, fieldName, val);
        },
        handleIntBlur: function(fieldName, ev) {
            var val = Number.parseInt(ev.target.value) || 0;
            this.props.onFieldEdit(this.props.model, fieldName, val);
        },
        removeInvitee: function(removeId) {
            this.props.onFieldEdit(this.props.model, 'otherInvitees',
                    this.props.model.otherInvitees.filter(function(id) {
                        return id != removeId;
                    })
                );
        },
        addInvitee: function(addId) {
            for (var i = 0; i < this.props.model.otherInvitees.length; i++) {
                if (this.props.model.otherInvitees[i] == addId) {
                    // person already invited
                    return;
                }
            }
            if (!(addId in this.props.userTextById)) {
                console.error('No user with id', addId);
                return;
            }
            this.props.onFieldEdit(this.props.model, 'otherInvitees',
                    this.props.model.otherInvitees.concat(addId));
        },
        removeRoom: function(removeId) {
            this.props.onFieldEdit(this.props.model, 'locations',
                this.props.model.locations.filter(function(id) {
                    return id != removeId;
                })
            );
        },
        addRoom: function(addId) {
            this.props.onFieldEdit(this.props.model, 'locations',
                this.props.model.locations.filter(function(id) {
                    return id != addId;
                }).concat(addId)
            );
        },
        render: function() {
            var errBox;
            if (this.props.errTxt) {
                errBox = <div>
                    <span className="status-error">{this.props.errTxt}</span>
                </div>;
            }

            return <div>
                <table className="event-template-fields">
                <tr>
                    <td><label>Summary:</label></td>
                    <td>
                        <input type="text"
                            disabled={this.props.disabled}
                            value={this.props.model.summary}
                            onChange={this.handleChange.bind(
                                    this, 'summary', false)}
                            />
                    </td>
                </tr>

                <tr>
                    <td><label>Description:</label></td>
                    <td>
                        <textarea
                            disabled={this.props.disabled}
                            value={this.props.model.description}
                            onChange={this.handleChange.bind(
                                    this, 'description', false)}
                            />
                    </td>
                </tr>

                <tr>
                    <td><label>Locations:</label></td>
                    <td>
                        <MultiSelect
                            disabled={this.props.disabled}
                            itemTextById={this.props.roomMSModel.itemTextById}
                            sortedIds={this.props.roomMSModel.sortedIds}
                            selectedIds={this.props.model.locations}
                            onRemove={this.removeRoom}
                            onAdd={this.addRoom}
                        />
                    </td>
                </tr>

                <tr>
                    <td>
                        <abbr title={'How many calendar days ' +
                            'to add or subtract from the start date.\n' +
                            '0 = the start date\n' +
                            '1 = the day after the start date\n' +
                            '-7 = one week before the start date'}>
                            Day offset
                        </abbr>:
                    </td>
                    <td>
                        <input type="number"
                            disabled={this.props.disabled}
                            value={this.props.model.dayOffset}
                            onChange={this.handleChange.bind(
                                    this, 'dayOffset', false)}
                            // If the user types 'hello' or '-' for '-3'
                            // only convert it to a number (0 for invalid
                            // strings) on blur
                            onBlur={this.handleIntBlur.bind(this, 'dayOffset')}
                            />
                    </td>
                </tr>

                <tr>
                    <td><label>From:</label></td>
                    <td>
                        <input type="time"
                            disabled={this.props.disabled}
                            value={this.props.model.startTime}
                            onChange={this.handleChange.bind(this, 'startTime', false)}
                            />
                        to
                        <input type="time"
                            disabled={this.props.disabled}
                            value={this.props.model.endTime}
                            onChange={this.handleChange.bind(this, 'endTime', false)}
                            />
                    </td>
                </tr>

                <tr>
                    <td><label>Event Type:</label></td>
                    <td>
                        <select
                            disabled={this.props.disabled}
                            value={this.props.model.isCollective ? 'true' :
                                'false'}
                            onChange={this.handleChange.bind(this,
                                    'isCollective', false)}
                            >
                            <option value='true'>
                                Common (invite all employees to the same event)
                            </option>
                            <option value='false'>
                                Individual (one separate event for each
                                        employee)
                            </option>
                        </select>
                    </td>
                </tr>

                <tr>
                    <td>Participants:</td>
                    <td>
                        <input type="checkbox"
                            disabled={this.props.disabled}
                            checked={this.props.model.inviteEmployees}
                            onChange={this.handleChange.bind(this,
                                    'inviteEmployees', false)}
                            />
                            Invite employee{this.props.model.isCollective ?
                                's' : ''}
                    </td>
                </tr>

                <tr>
                    <td></td>
                    <td>
                        <input type="checkbox"
                            disabled={this.props.disabled}
                            checked={this.props.model.inviteSupervisors}
                            onChange={this.handleChange.bind(this,
                                    'inviteSupervisors', false)}
                            />
                            Invite supervisor{this.props.model.isCollective ?
                                's' : ''}
                    </td>
                </tr>

                <tr>
                    <td><label>Other participants:</label></td>
                    <td>
                        <MultiSelect
                            itemTextById={this.props.userTextById}
                            sortedIds={this.props.alphabeticalUserIds}
                            selectedIds={this.props.model.otherInvitees}
                            onRemove={this.removeInvitee}
                            onAdd={this.addInvitee}
                            disabled={this.props.disabled}
                            />
                    </td>
                </tr>

                <tr>
                    <td></td>
                    <td>
                    </td>
                </tr>
                </table>

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

    return EventTemplate;
})();
