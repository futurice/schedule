/** @jsx React.DOM */

// TODO: clean up a bit. Argument passing is a bit messy (passing whole objects
// e.g. Users instead of just IDs) in a few places. One place doesn't reuse
// MultiPersonSelect but instead has a <select> and add/remove functions.
// This is because of speed to get a working prototype asap.

var NewSchedule;
(function() {
    // app stage while creating a new schedule.
    // These can be anything comparable via ‘==’ (strings, unique objects).
    var STAGE_PREPARE = {}, STAGE_EDIT = {};

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
            getRestLoaderMixin('/futuintro/api/scheduletemplates/',
                'sTempl', 'sTemplLoaded', 'sTemplErr'),
            getRestLoaderMixin(
                '/futuintro/api/users/?ordering=first_name,last_name',
                'users', 'usersLoaded', 'usersErr',
                function() {
                    var usersById = {};
                    this.state.users.forEach(function(u) {
                        usersById[u.id] = u;
                    });
                    this.setState({
                        usersById: usersById
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

                selectedSchedTempl: null,
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
        render: function() {
            var err = this.state.sTemplErr || this.state.usersErr;
            if (err) {
                return <div>{err}</div>;
            }
            var loaded = this.state.sTemplLoaded && this.state.usersLoaded
                && this.state.usersById;
            if (!loaded) {
                return <div>Loading…</div>;
            }

            if (this.state.stage == STAGE_PREPARE) {
                return <NewSchedPrepare
                    scheduleTemplates={this.state.sTempl}
                    selectedSchedTempl={this.state.selectedSchedTempl}
                    startDate={this.state.startDate}
                    users={this.state.users}
                    selectedUsers={this.state.selectedUsers}
                    onSelectScheduleTemplate={this.setField.bind(this,
                            'selectedSchedTempl')}
                    onSelectUsers={this.setField.bind(this, 'selectedUsers')}
                    onStartDateChange={this.setField.bind(this, 'startDate')}
                    onAdvance={this.gotoEdit}
                />;
            }

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
                selectedUsers={this.state.selectedUsers}
                onCancel={this.gotoPrepare}
                />;
        }
    });

    var NewSchedPrepare = React.createClass({
        propTypes: {
            scheduleTemplates: React.PropTypes.array.isRequired,
            // object or null
            selectedSchedTempl: React.PropTypes.any,
            startDate: React.PropTypes.string.isRequired,
            users: React.PropTypes.array.isRequired,
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
        addUser: function() {
            var id = Number.parseInt(this.refs.userSelect.getDOMNode().value);
            var user;
            this.props.users.forEach(function(u) {
                if (u.id == id) {
                    user = u;
                }
            });
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
            this.props.onStartDateChange(this.refs.startDate.getDOMNode().value);
        },
        handleStartDateBlur: function() {
            var val = this.refs.startDate.getDOMNode().value;
            if (val == '' || Number.isNaN(new Date(val).valueOf())) {
                val = fmtLocalDate(new Date());
            }
            this.props.onStartDateChange(val);
        },
        render: function() {
            return <div>
                <label>From template:</label>
                <select
                    value={this.props.selectedSchedTempl}
                    onChange={this.schedTemplChanged}
                    >
                    <option value='null'>—</option>
                    {this.props.scheduleTemplates.map(function(st) {
                        return <option value={st.id} key={st.id}>
                            {st.name}
                        </option>;
                    })}
                </select>
                <br/>

                <label>Start date:</label>
                <input type="date" ref="startDate"
                    value={this.props.startDate}
                    onChange={this.handleStartDateChange}
                    onBlur={this.handleStartDateBlur}/>
                <br/>

                <label>For Employees:</label>
                <ul>
                    {this.props.selectedUsers.map((function(u) {
                        return <li key={u.id}>
                            {u.first_name + ' ' + u.last_name}
                            <a href="#"
                                onClick={this.removeUser.bind(this, u.id)}
                                >×</a>
                        </li>;
                    }).bind(this))}
                </ul>
                <select ref="userSelect">
                    {this.props.users.map(function(u) {
                        return <option key={u.id} value={u.id}>
                            {u.first_name + ' ' + u.last_name +
                                ' <' + u.email + '>'}
                        </option>;
                    })}
                </select>
                <button type="button" onClick={this.addUser}>+ Add</button>
                <br/>

                <span>Prepare new schedule</span>
                <button type="button" onClick={this.props.onAdvance}>
                    Start!
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
            selectedUsers: React.PropTypes.array.isRequired,
            onCancel: React.PropTypes.func.isRequired
        },
        componentDidMount: function() {
            compFetchRest.bind(this)('/futuintro/api/calendarresources/',
                'rooms', 'roomsLoaded', 'roomsErr');
            compFetchRest.bind(this)('/futuintro/api/eventtemplates/?scheduleTemplate=' + this.props.scheduleTemplate.id,
                'evTempl', 'evTemplLoaded', 'evTemplErr',
                function() {
                    // format 'YYYY-MM-DD' guarantees midnight in UTC timezone.
                    var startDate = new Date(this.props.startDate);
                    var dayMillis = 1000*60*60*24;

                    function eventFromTemplate(et, forUsers) {
                        var result = clone(et);

                        delete result.scheduleTemplate;

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
                                }
                            });
                        }
                        delete result.inviteSupervisors;

                        delete result.isCollective;

                        return result;
                    }

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
                evGroups: null
            };
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
            // TODO: disable buttons during AJAX call and handle errors

            $.ajax({
                url: '/futuintro/create-schedules/',
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
                            var crt = {
                                meta: {
                                    isCollective: et.isCollective
                                }
                            };
                            var data;
                            if (et.isCollective) {
                                result.push({
                                    meta: {
                                        isCollective: true
                                    },
                                    data: clone(this.state.evGroups[idx])
                                });
                            } else {
                                this.props.selectedUsers.forEach((function(u, j) {
                                    if (this.state.evGroups[idx][j]) {
                                        result.push({
                                            meta: {
                                                isCollective: false,
                                                forUser: u.id
                                            },
                                            data: clone(this.state.evGroups[idx][j])
                                        });
                                    }
                                }).bind(this));
                            }
                        }).bind(this));
                        return result;
                    }).bind(this)()
                }),
                success: (function(data) {
                    alert('it worked');
                }).bind(this),
                error: (function(xhr, txtStatus, saveErr) {
                    alert('error');
                }).bind(this)
            });
        },
        render: function() {
            var err = this.state.evTemplErr || this.state.roomsErr;
            if (err) {
                return <div>{err}</div>;
            }
            var loaded = this.state.evTemplLoaded && this.state.evGroups &&
                this.state.roomsLoaded;
            if (!loaded) {
                return <div>Loading…</div>;
            }

            return <div>
                Based on template: {this.props.scheduleTemplate.name}
                <ul>
                {this.state.evTempl.map((function(et, idx) {
                    function getFullName(user) {
                        return user.first_name + ' ' + user.last_name;
                    }

                    var eventsBox;
                    if (et.isCollective) {
                        eventsBox = <EventEditor
                            model={this.state.evGroups[idx]}
                            rooms={this.state.rooms}
                            usersById={this.props.usersById}
                            users={this.props.users}
                            onFieldEdit={this.handleEventFieldEdit.bind(this,
                                idx, null)}
                        />;
                    } else {
                        eventsBox = <ul>
                            {this.state.evGroups[idx].map((function(ev, j) {
                                var fullName = getFullName(
                                    this.props.selectedUsers[j]);

                                if (ev == null) {
                                    return <li key={j}>Deleted event for
                                        {fullName}
                                    </li>;
                                }
                                return <li key={j}>
                                    Event for {fullName}
                                    <button type="button"
                                        onClick={this.deleteIndividualEvent.bind(this, idx, j)}>
                                        Delete
                                    </button>
                                    <EventEditor
                                        model={ev}
                                        rooms={this.state.rooms}
                                        usersById={this.props.usersById}
                                        users={this.props.users}
                                        onFieldEdit={
                                            this.handleEventFieldEdit.bind(
                                                this, idx, j)}
                                    />
                                </li>;
                            }).bind(this))}
                        </ul>;
                    }

                    return <li key={et.id} className={'event-group-' +
                        (et.isCollective ? 'collective' : 'individual')}>
                        {et.summary} {' ('}
                        {et.isCollective ?
                            'common event for ' +
                            this.props.selectedUsers.map(getFullName).join(', ') :
                            'separate event for each person'}
                        {')'}
                        <button type="button"
                            onClick={this.deleteEventAndGroup.bind(this, idx)}>
                            Delete
                        </button>
                        <br/>

                        {eventsBox}
                        <br/>
                        {JSON.stringify(this.state.evGroups[idx])}
                        <br/>
                    </li>;
                }).bind(this))}
                </ul>
                <button type="button" onClick={this.createEvents}>
                    Create Events in Google Calendar
                </button>
                <button type="button" onClick={this.props.onCancel}>
                CANCEL
                </button>
            </div>;
        }
    });

    var EventEditor = React.createClass({
        propTypes: {
            model: React.PropTypes.object.isRequired,
            rooms: React.PropTypes.array.isRequired,
            usersById: React.PropTypes.object.isRequired,
            users: React.PropTypes.array.isRequired,
            disabled: React.PropTypes.bool.isRequired,

            // onFieldEdit(fieldName, newValue)
            onFieldEdit: React.PropTypes.func.isRequired
        },
        handleChange: function(fieldName, convertToInt, ev) {
            var val = getTargetValue(ev);
            if (convertToInt && typeof(val) == 'string') {
                val = Number.parseInt(val) || 0;
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
        render: function() {
            return <div>
                <label>Summary:</label>
                <input
                    disabled={this.props.disabled}
                    value={this.props.model.summary}
                    onChange={this.handleChange.bind(this, 'summary', false)}
                />
                <br/>

                <label>Description:</label>
                <textarea
                    disabled={this.props.disabled}
                    value={this.props.model.description}
                    onChange={this.handleChange.bind(this, 'description', false)}
                />
                <br/>

                <label>Location:</label>
                <select
                    disabled={this.props.disabled}
                    value={this.props.model.location === null ?
                        'null' : this.props.model.location}
                    onChange={this.handleChange.bind(this, 'location', true)}
                    >
                    <option value='null'>—</option>
                    {this.props.rooms.map(function(r) {
                        return <option key={r.id} value={r.id}>{r.name}</option>;
                    })}
                </select>
                <br/>

                <label>Date:</label>
                <input type="date"
                    value={this.props.model.date}
                    onChange={this.handleChange.bind(this, 'date', false)}
                    onBlur={this.handleDateBlur}/>
                <br/>

                <label>From:</label>
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
                <br/>

                <label>People to invite:</label>
                <MultiPersonSelect
                    allPersonsById={this.props.usersById}
                    allPersons={this.props.users}
                    selectedIds={this.props.model.invitees}
                    onRemove={this.removeInvitee}
                    onAdd={this.addInvitee}
                    disabled={this.props.disabled}
                    />
                <br/>
            </div>;
        }
    });
})();
