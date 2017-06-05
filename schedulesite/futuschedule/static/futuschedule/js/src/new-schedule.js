// TODO: clean up a bit. Argument passing is a bit messy (passing whole objects
// e.g. Users instead of just IDs) in a few places.
// This is because of speed to get a working prototype asap.

var NewSchedule;
(function() {
    // app stage while creating a new schedule.
    // These can be anything comparable via ‘==’ (strings, unique objects).
    var STAGE_PREPARE = {}, STAGE_EDIT = {}, STAGE_SUBMITTED = {};

    function fmtLocalDate(date) {
        var y = date.getFullYear(), m = (date.getMonth() + 1),
            d = date.getDate();
        return y + '-' + (m < 10 ? '0' : '') + m + '-' +
            (d < 10 ? '0' : '') + d;
    }
    function fmtUTCDate(date) {
        var y = date.getUTCFullYear(), m = (date.getUTCMonth() + 1),
            d = date.getUTCDate();
        return y + '-' + (m < 10 ? '0' : '') + m + '-' +
            (d < 10 ? '0' : '') + d;
    }

    NewSchedule = React.createClass({
        mixins: [
            getRestLoaderMixin(apiRoot + 'scheduletemplates/?ordering=name',
                'sTempl', 'sTemplLoaded', 'sTemplErr'),
            getRestLoaderMixin(
                apiRoot + 'users/?ordering=first_name,last_name',
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
                })
        ],
        getInitialState: function() {
            return {
                stage: STAGE_PREPARE,

                sTempl: [],
                sTemplLoaded: false,
                sTemplErr: '',

                users: [],
                usersLoaded: false,
                usersErr: '',

                usersById: null,
                userTextById: null,
                alphabeticalUserIds: null,

                selectedSchedTempl: "",
                selectedUsers: [],
                startDate: fmtLocalDate(new Date())
            };
        },
        setField: function(fieldName, value) {
            var state = this.state;
            state[fieldName] = value;
            this.setState(state);
        },
        gotoEdit: function() {
            if (!this.state.selectedSchedTempl) {
                alert('Select a Schedule Template first');
                return;
            }
            if (!this.state.selectedUsers.length) {
                alert('Add at least one employee to the list');
                return;
            }

            // defensive: make sure the schedule template exists
            var stObj;
            this.state.sTempl.forEach((function(st) {
                if (st.id == this.state.selectedSchedTempl) {
                    stObj = st;
                }
            }).bind(this));
            if (!stObj) {
                console.log('Unknown schedule template ID',
                        this.state.selectedSchedTempl);
                return;
            }

            this.setState({
                stage: STAGE_EDIT
            });
        },
        gotoPrepare: function() {
            this.setState({
                stage: STAGE_PREPARE
            });
        },
        gotoSubmitted: function() {
            this.setState({
                stage: STAGE_SUBMITTED
            });
        },
        startOver: function() {
            this.setState({
                stage: STAGE_PREPARE,
                selectedSchedTempl: null,
                selectedUsers: [],
                startDate: fmtLocalDate(new Date())
            });
        },
        render: function() {
            var err = this.state.sTemplErr || this.state.usersErr;
            if (err) {
                return <div><span className="status-error">{err}</span></div>;
            }
            var loaded = this.state.sTemplLoaded && this.state.usersLoaded
                && this.state.usersById && this.state.userTextById
                && this.state.alphabeticalUserIds;
            if (!loaded) {
                return <div>
                    <span className="status-waiting">Loading…</span>
                </div>;
            }

            if (this.state.stage == STAGE_PREPARE) {
                return <NewSchedPrepare
                    scheduleTemplates={this.state.sTempl}
                    selectedSchedTempl={this.state.selectedSchedTempl}
                    startDate={this.state.startDate}
                    usersById={this.state.usersById}
                    userTextById={this.state.userTextById}
                    alphabeticalUserIds={this.state.alphabeticalUserIds}
                    selectedUsers={this.state.selectedUsers}
                    onSelectScheduleTemplate={this.setField.bind(this,
                            'selectedSchedTempl')}
                    onSelectUsers={this.setField.bind(this, 'selectedUsers')}
                    onStartDateChange={this.setField.bind(this, 'startDate')}
                    onAdvance={this.gotoEdit}
                />;
            } else if (this.state.stage == STAGE_EDIT) {
                var schedTemplObj;
                this.state.sTempl.forEach((function(st) {
                    if (st.id == this.state.selectedSchedTempl) {
                        schedTemplObj = st;
                    }
                }).bind(this));
                return <NewSchedEdit
                    scheduleTemplate={schedTemplObj}
                    startDate={this.state.startDate}
                    users={this.state.users}
                    usersById={this.state.usersById}
                    userTextById={this.state.userTextById}
                    alphabeticalUserIds={this.state.alphabeticalUserIds}
                    selectedUsers={this.state.selectedUsers}
                    onCancel={this.gotoPrepare}
                    onSuccess={this.gotoSubmitted}
                    />;
            } else {
                return <NewSchedSubmitted
                    onCreateAnother={this.startOver}
                    />;
            }
        }
    });

    var NewSchedPrepare = React.createClass({
        propTypes: {
            scheduleTemplates: React.PropTypes.array.isRequired,
            // object or null
            selectedSchedTempl: React.PropTypes.any,
            startDate: React.PropTypes.string.isRequired,
            usersById: React.PropTypes.object.isRequired,
            userTextById: React.PropTypes.object.isRequired,
            alphabeticalUserIds: React.PropTypes.array.isRequired,
            selectedUsers: React.PropTypes.array.isRequired,

            onSelectScheduleTemplate: React.PropTypes.func.isRequired,
            onStartDateChange: React.PropTypes.func.isRequired,
            onSelectUsers: React.PropTypes.func.isRequired,
            onAdvance: React.PropTypes.func.isRequired
        },
        schedTemplChanged: function(ev) {
            var val = getTargetValue(ev);
            this.props.onSelectScheduleTemplate(val);
        },
        removeUser: function(id) {
            var selectedUsers = this.props.selectedUsers.filter(function(x) {
                return x.id != id;
            });
            this.props.onSelectUsers(selectedUsers);
        },
        addUser: function(id) {
            var user = this.props.usersById[id];
            if (!user) {
                console.error('User with id', id, 'not found');
                return;
            }

            var selectedUsers = this.props.selectedUsers.filter(function(x) {
                return x.id != id;
            });
            selectedUsers.push(user);
            this.props.onSelectUsers(selectedUsers);
        },
        handleStartDateChange: function() {
            var val = ReactDOM.findDOMNode(this.refs.startDate).value;
            this.props.onStartDateChange(val);
        },
        handleStartDateBlur: function() {
            var val = ReactDOM.findDOMNode(this.refs.startDate).value;
            if (val == '' || Number.isNaN(new Date(val).valueOf())) {
                val = fmtLocalDate(new Date());
            }
            this.props.onStartDateChange(val);
        },
        render: function() {
            return <div id="new-schedule-prepare">
                <table id="new-schedule-fields">
                <tbody>
                <tr>
                    <td><label>From template:</label></td>
                    <td>
                        <select
                            value={this.props.selectedSchedTempl}
                            onChange={this.schedTemplChanged}
                            >
                            <option value="">—</option>
                            {this.props.scheduleTemplates.map(function(st) {
                                return <option value={st.id} key={st.id}>
                                    {st.name}
                                </option>;
                            })}
                        </select>
                    </td>
                </tr>
                <tr>
                    <td><label>Start date:</label></td>
                    <td>
                        <input type="date" ref="startDate"
                            value={this.props.startDate}
                            onChange={this.handleStartDateChange}
                            onBlur={this.handleStartDateBlur}/>
                    </td>
                </tr>
                <tr>
                    <td><label>For Employees:</label></td>
                    <td>
                        <MultiSelect
                            itemTextById={this.props.userTextById}
                            sortedIds={this.props.alphabeticalUserIds}
                            selectedIds={this.props.selectedUsers.map(
                                    function(u) { return u.id; }
                            )}
                            onRemove={this.removeUser}
                            onAdd={this.addUser}
                            disabled={false}
                            />
                    </td>
                </tr>
                </tbody>
                </table>

                <button type="button" onClick={this.props.onAdvance}>
                    Configure new schedule
                    {this.props.selectedUsers.length > 1 ? 's' : ''}…
                </button>
            </div>;
        }
    });

    var NewSchedEdit = React.createClass({
        propTypes: {
            scheduleTemplate: React.PropTypes.object.isRequired,
            startDate: React.PropTypes.string.isRequired,
            users: React.PropTypes.array.isRequired,
            usersById: React.PropTypes.object.isRequired,
            userTextById: React.PropTypes.object.isRequired,
            alphabeticalUserIds: React.PropTypes.array.isRequired,
            selectedUsers: React.PropTypes.array.isRequired,
            onCancel: React.PropTypes.func.isRequired,
            onSuccess: React.PropTypes.func.isRequired
        },
        componentDidMount: function() {
            compFetchRest.bind(this)(apiRoot + 'calendarresources/',
                'rooms', 'roomsLoaded', 'roomsErr',
                function() {
                    this.setState({
                        roomMSModel: makeRoomMultiSelectModel(this.state.rooms)
                    });
                });
            compFetchRest.bind(this)(apiRoot + 'eventtemplates/' +
                '?scheduleTemplate=' + this.props.scheduleTemplate.id +
                '&ordering=dayOffset,startTime',
                'evTempl', 'evTemplLoaded', 'evTemplErr',
                function() {
                    // format 'YYYY-MM-DD' guarantees midnight in UTC timezone.
                    var startDate = new Date(this.props.startDate);
                    var dayMillis = 1000*60*60*24;

                    var eventFromTemplate = (function (et, forUsers) {
                        var result = clone(et);

                        delete result.scheduleTemplate;

                        var usersSentence = enumSentence(
                            forUsers.map(function(u) {
                                return u.first_name + ' ' + u.last_name;
                            })
                        );
                        result.summary += ' – ' + usersSentence;

                        result.eventTemplate = result.id;
                        delete result.id;

                        result.date = fmtUTCDate(new Date(
                                startDate.valueOf() + result.dayOffset*dayMillis));
                        delete result.dayOffset;

                        ['startTime', 'endTime'].forEach(function(fName) {
                            result[fName] = dropSeconds(result[fName]);
                        });

                        result.invitees = result.otherInvitees;
                        delete result.otherInvitees;

                        if (result.inviteEmployees) {
                            forUsers.forEach(function(u) {
                                var existing = false;
                                result.invitees.forEach(function(id) {
                                    if (id == u.id) {
                                        existing = true;
                                    }
                                });
                                if (!existing) {
                                    result.invitees.push(u.id);
                                }
                            });
                        }
                        delete result.inviteEmployees;

                        var userIdsWithoutSupervisor = [];
                        if (result.inviteSupervisors) {
                            forUsers.forEach(function(u) {
                                var s_id = u.supervisor;
                                if (s_id) {
                                    var existing = false;
                                    result.invitees.forEach(function(id) {
                                        if (id == s_id) {
                                            existing = true;
                                        }
                                    });
                                    if (!existing) {
                                        result.invitees.push(s_id);
                                    }
                                } else {
                                    userIdsWithoutSupervisor.push(u.id);
                                }
                            });
                        }
                        delete result.inviteSupervisors;

                        result.supervisorWarning = '';
                        if (userIdsWithoutSupervisor.length) {
                            result.supervisorWarning = 'The template invites ' +
                                'supervisors, but there\'s no supervisor for ' +
                                enumSentence(
                                        userIdsWithoutSupervisor.map(function(uid) {
                                            return getUserName(uid, this.props.usersById);
                                        }, this)) + '.';
                        }

                        delete result.isCollective;

                        return result;
                    }).bind(this);

                    // create event groups
                    var evGroups = this.state.evTempl.map((function(et) {
                        if (et.isCollective) {
                            return eventFromTemplate(et,
                                this.props.selectedUsers);
                        }

                        return this.props.selectedUsers.map(function(u) {
                            return eventFromTemplate(et, [u]);
                        });
                    }).bind(this));
                    this.setState({
                        evGroups: evGroups
                    });
                });
        },
        getInitialState: function() {
            return {
                evTempl: [],
                evTemplLoaded: false,
                evTemplErr: '',

                rooms: [],
                roomsLoaded: false,
                roomsErr: '',
                // model for MultiSelect
                roomMSModel: null,

                // one group per event template: a group is 1 element for a
                // collective template, or an array of  N elements (one per
                // user) for an individual event template.
                //
                // Deleting:
                // ― collective event: delete the event template and delete
                // the event group.
                // ― individual event: the event group is an array. Deleting
                // the event for a user replaces that array entry with null.
                // When all entries are replaced with null, remove the whole
                // event group and the event template (just like in the
                // collective case).
                evGroups: null,

                ajaxInFlight: '',
                ajaxErr: ''
            };
        },
        shouldDisable: function() {
            return this.state.ajaxInFlight != '';
        },
        deleteEventAndGroup: function(idx) {
            var evTempl = this.state.evTempl.concat(),
                evGroups = this.state.evGroups.concat();
            evTempl.splice(idx, 1);
            evGroups.splice(idx, 1);
            this.setState({
                evTempl: evTempl,
                evGroups: evGroups
            });
        },
        deleteIndividualEvent: function(groupIdx, eventIdx) {
            var group = this.state.evGroups[groupIdx];
            // if this is the last one, delete the whole group
            for (var i = 0; i < group.length; i++) {
                if (i != eventIdx && group[i] != null) {
                    break;
                }
            }
            if (i == group.length) {
                this.deleteEventAndGroup(groupIdx);
                return;
            }

            var evGroups = this.state.evGroups.concat();
            evGroups[groupIdx] = evGroups[groupIdx].concat();
            evGroups[groupIdx][eventIdx] = null;
            this.setState({
                evGroups: evGroups
            });
        },
        handleEventFieldEdit: function(grpIdx, evIdx, fieldName, value) {
            var evGroups = this.state.evGroups.concat();
            var event;
            if (this.state.evTempl[grpIdx].isCollective) {
                evGroups[grpIdx] = clone(evGroups[grpIdx]);
                event = evGroups[grpIdx];
            } else {
                evGroups[grpIdx] = evGroups[grpIdx].concat();
                evGroups[grpIdx][evIdx] = clone(evGroups[grpIdx][evIdx]);
                event = evGroups[grpIdx][evIdx];
            }
            event[fieldName] = value;
            this.setState({
                evGroups: evGroups
            });
        },
        createEvents: function() {
            this.setState({
                ajaxInFlight: 'Creating…'
            });

            // The items in evGroups have extra fields, like the warning about
            // a missing supervisor, which we don't send to the endpoint.
            function getDataToSend(evGrp) {
                var result = {};
                ['summary', 'description', 'locations', 'date', 'startTime',
                    'endTime', 'invitees', 'eventTemplate'
                ].forEach(function(fName) {
                    result[fName] = clone(evGrp[fName]);
                });
                return result;
            }
            $.ajax({
                url: '/create-schedules/',
                type: 'POST',
                contentType: 'application/json; charset=UTF-8',
                headers: {'X-CSRFToken': $.cookie('csrftoken')},
                data: JSON.stringify({
                    scheduleTemplate: this.props.scheduleTemplate.id,
                    users: this.props.selectedUsers.map(function(u) {
                        return u.id;
                    }),
                    events: (function() {
                        var result = [];
                        this.state.evTempl.forEach((function(et, idx) {
                            var data;
                            if (et.isCollective) {
                                result.push({
                                    meta: {
                                        isCollective: true
                                    },
                                    data: getDataToSend(this.state.evGroups[idx])
                                });
                            } else {
                                this.props.selectedUsers.forEach((function(u, j) {
                                    if (this.state.evGroups[idx][j]) {
                                        result.push({
                                            meta: {
                                                isCollective: false,
                                                forUser: u.id
                                            },
                                            data: getDataToSend(this.state.evGroups[idx][j])
                                        });
                                    }
                                }).bind(this));
                            }
                        }).bind(this));
                        return result;
                    }).bind(this)()
                }),
                complete: (function(data) {
                    this.isMounted() && this.setState({
                        ajaxInFlight: ''
                    });
                }).bind(this),
                success: (function(data) {
                    this.isMounted() && this.setState({
                        ajaxErr: ''
                    });
                    this.props.onSuccess();
                }).bind(this),
                error: (function(xhr, txtStatus, saveErr) {
                    this.setState({ajaxErr: getAjaxErr.apply(this, arguments)});
                }).bind(this)
            });
        },
        render: function() {
            var err = this.state.evTemplErr || this.state.roomsErr;
            if (err) {
                return <div><span className='status-err'>{err}</span></div>;
            }
            var loaded = this.state.evTemplLoaded && this.state.evGroups &&
                this.state.roomsLoaded && this.state.roomMSModel;
            if (!loaded) {
                return <div>
                    <span className='status-waiting'>Loading…</span>
                </div>;
            }

            var statusBox;
            if (this.state.ajaxInFlight) {
                statusBox = <div>
                    <span className="status-waiting">
                        {this.state.ajaxInFlight}
                    </span>
                </div>;
            } else if (this.state.ajaxErr) {
                statusBox = <div>
                    <span className="status-error">
                        {this.state.ajaxErr}
                    </span>
                </div>;
            }

            return <div id="new-schedule-edit">
                <h2 className="no-margin">
                    From template:{' '}
                    {this.props.scheduleTemplate.name}
                </h2>
                <section id="new-schedule-events">
                {this.state.evTempl.map((function(et, idx) {
                    function getFullName(user) {
                        return user.first_name + ' ' + user.last_name;
                    }

                    var eventsBox;
                    if (et.isCollective) {
                        eventsBox = <EventEditor
                            usersById={this.props.usersById}
                            disabled={this.shouldDisable()}
                            model={this.state.evGroups[idx]}
                            roomMSModel={this.state.roomMSModel}
                            users={this.props.users}
                            userTextById={this.props.userTextById}
                            alphabeticalUserIds={this.props.alphabeticalUserIds}
                            onFieldEdit={this.handleEventFieldEdit.bind(this,
                                idx, null)}
                            onDelete={this.deleteEventAndGroup.bind(this, idx)}
                        />;
                    } else {
                        eventsBox = <div className="individual-events-list">
                            {this.state.evGroups[idx].map((function(ev, j) {
                                var fullName = getFullName(
                                    this.props.selectedUsers[j]);

                                if (ev == null) {
                                    return <div key={j}
                                            className="event-editor">
                                        Deleted event for {fullName}.
                                    </div>;
                                }
                                return <EventEditor
                                    key={j}
                                    usersById={this.props.usersById}
                                    disabled={this.shouldDisable()}
                                    model={ev}
                                    roomMSModel={this.state.roomMSModel}
                                    users={this.props.users}
                                    userTextById={this.props.userTextById}
                                    alphabeticalUserIds={this.props.alphabeticalUserIds}
                                    onFieldEdit={
                                        this.handleEventFieldEdit.bind(
                                            this, idx, j)}
                                    onDelete={this.deleteIndividualEvent.bind(this, idx, j)}
                                />;
                            }).bind(this))}
                        </div>;
                    }

                    return <article key={et.id} className={'event-group-' +
                        (et.isCollective ? 'collective' : 'individual')}>
                        {et.isCollective ? '' :
                            <b>{et.summary} (individual events)</b>}
                        {eventsBox}

                        {et.isCollective ? '' :
                            <button type="button"
                                disabled={this.shouldDisable()}
                                onClick={this.deleteEventAndGroup.bind(this, idx)}>
                                ✗ Delete
                            </button>}
                    </article>;
                }).bind(this))}
                </section>

                <button type="button"
                    disabled={this.shouldDisable()}
                    onClick={this.createEvents}>
                    Create Events in Google Calendar
                </button> {' '}
                <button type="button"
                    disabled={this.shouldDisable()}
                    onClick={this.props.onCancel}>
                    Cancel
                </button>
                {statusBox}
            </div>;
        }
    });

    var EventEditor = React.createClass({
        propTypes: {
            model: React.PropTypes.object.isRequired,
            roomMSModel: React.PropTypes.object.isRequired,
            users: React.PropTypes.array.isRequired,
            userTextById: React.PropTypes.object.isRequired,
            alphabeticalUserIds: React.PropTypes.array.isRequired,
            disabled: React.PropTypes.bool.isRequired,

            usersById: React.PropTypes.object.isRequired,

            // onFieldEdit(fieldName, newValue)
            onFieldEdit: React.PropTypes.func.isRequired,
            onDelete: React.PropTypes.func.isRequired
        },
        getInitialState: function() {
            return {
                collapsed: true
            };
        },
        toggleCollapsed: function() {
            this.setState({
                collapsed: !this.state.collapsed
            });
        },
        handleChange: function(fieldName, convertToInt, ev) {
            var val = getTargetValue(ev);
            if (convertToInt && typeof(val) == 'string') {
                val = parseInt(val, 10) || 0;
            }
            this.props.onFieldEdit(fieldName, val);
        },
        handleDateBlur: function() {
            // TODO: not sure about this (maybe a race condition if
            // hadleChange() doesn't yet propagate the state change
            // by the time handleDateBlur() runs).
            var val = this.props.model.date;
            if (val == '' || Number.isNaN(new Date(val).valueOf())) {
                val = fmtLocalDate(new Date());
            }
            this.props.onFieldEdit('date', val);
        },
        removeInvitee: function(id) {
            this.props.onFieldEdit('invitees',
                    this.props.model.invitees.filter(function(x) {
                        return x != id;
                    }));
        },
        addInvitee: function(id) {
            for (var i = 0; i < this.props.model.invitees.length; i++) {
                if (this.props.model.invitees[i] == id) {
                    return;
                }
            }
            this.props.onFieldEdit('invitees',
                    this.props.model.invitees.concat(id));
        },
        removeRoom: function(removeId) {
            this.props.onFieldEdit('locations',
                this.props.model.locations.filter(function(id) {
                    return id != removeId;
                })
            );
        },
        addRoom: function(addId) {
            this.props.onFieldEdit('locations',
                this.props.model.locations.filter(function(id) {
                    return id != addId;
                }).concat(addId)
            );
        },
        fmtCollapsedDate: function() {
            var d = new Date(this.props.model.date);
            var result = weekdayLongNames[d.getDay()] + ', ' +
                monthLongNames[d.getMonth()] + ' ' + d.getDate();
            if (d.getFullYear() != new Date().getFullYear()) {
                result += ', ' + d.getFullYear();
            }
            return result;
        },
        render: function() {
            if (this.state.collapsed) {
                return <div className="event-editor collapsed"
                        title="Click to Expand"
                        onClick={this.toggleCollapsed}>
                    <b>
                        ▶ {this.props.model.summary}
                    </b>
                    <br/>

                    {this.fmtCollapsedDate()} at {' '}
                    {this.props.model.startTime} → {this.props.model.endTime}
                    {' '}{this.props.model.locations.length ?
                        'in ' + enumSentence(this.props.model.locations.map((function(x) {
                            return this.props.roomMSModel.itemTextById[x];
                        }).bind(this))) + '.':
                        <span className="info">no location</span>}
                    {this.props.model.supervisorWarning ?
                        <span className="warn">
                            <br/>
                            {this.props.model.supervisorWarning}
                        </span>
                    : ''}
                    <br/>
                    {this.props.model.invitees.length ?
                        'Invite: ' + enumSentence(this.props.model.invitees.map((function(x) {
                            return getUserName(x, this.props.usersById);
                        }).bind(this))) + '.' :
                        <span className="warn">Invite: Nobody</span>}
                    <br/>
                    <button type="button"
                        disabled={this.props.disabled}
                        title="Delete"
                        onClick={this.props.onDelete}>
                        ✗ Delete
                    </button>
                </div>;
            }

            return <div className="event-editor expanded">
                <span onClick={this.toggleCollapsed}
                    className="collapse-symbol"
                    title="Click to Collapse">
                    ▼
                </span>
                <table className="new-event-fields">
                <tbody>
                <tr>
                    <td>
                        <label>Summary:</label>
                    </td>
                    <td>
                        <input
                            className="event-summary"
                            disabled={this.props.disabled}
                            value={this.props.model.summary}
                            onChange={this.handleChange.bind(this,
                                    'summary', false)}
                        />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>Description:</label>
                    </td>
                    <td>
                        <textarea
                            className="event-description"
                            rows="3"
                            disabled={this.props.disabled}
                            value={this.props.model.description}
                            onChange={this.handleChange.bind(this,
                                    'description', false)}
                        />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>Locations:</label>
                    </td>
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
                        <label>Date:</label>
                    </td>
                    <td>
                        <input type="date"
                            disabled={this.props.disabled}
                            value={this.props.model.date}
                            onChange={this.handleChange.bind(this, 'date', false)}
                            onBlur={this.handleDateBlur}/>
                        {' '} {weekdayLongNames[
                                  new Date(this.props.model.date).getDay()]}
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>From:</label>
                    </td>
                    <td>
                        <input type="time"
                            disabled={this.props.disabled}
                            value={this.props.model.startTime}
                            onChange={this.handleChange.bind(this, 'startTime', false)}
                            />
                        {' to '}
                        <input type="time"
                            disabled={this.props.disabled}
                            value={this.props.model.endTime}
                            onChange={this.handleChange.bind(this, 'endTime', false)}
                            />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>People to invite:</label>
                    </td>
                    <td>
                        {this.props.model.supervisorWarning ?
                            <span className="warn">
                                {this.props.model.supervisorWarning}
                            </span>
                        : ''}
                        <MultiSelect
                            itemTextById={this.props.userTextById}
                            sortedIds={this.props.alphabeticalUserIds}
                            selectedIds={this.props.model.invitees}
                            onRemove={this.removeInvitee}
                            onAdd={this.addInvitee}
                            disabled={this.props.disabled}
                            />
                    </td>
                </tr>
                </tbody>
                </table>

                <button type="button"
                    disabled={this.props.disabled}
                    onClick={this.props.onDelete}>
                    ✗ Delete
                </button>
            </div>;
        }
    });

    var NewSchedSubmitted = React.createClass({
        propTypes: {
            onCreateAnother: React.PropTypes.func.isRequired
        },
        render: function() {
            return <div>
                The schedule has been submitted and will be created shortly.
                <br/>
                <button onClick={this.props.onCreateAnother}>
                    Create another schedule
                </button>
            </div>;
        }
    });
})();
