/** @jsx React.DOM */

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
                usersById={this.state.usersById}
                selectedUsers={this.state.selectedUsers}
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
            if (val == '' || new Date(val).valueOf() === NaN) {
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
            usersById: React.PropTypes.object.isRequired,
            selectedUsers: React.PropTypes.array.isRequired
        },
        componentDidMount: function() {
            compFetchRest.bind(this)('/futuintro/api/eventtemplates/?scheduleTemplate=' + this.props.scheduleTemplate.id,
                'evTempl', 'evTemplLoaded', 'evTemplErr',
                function() {
                    var startDate = new Date(this.props.startDate);
                    startDate = new Date(startDate.valueOf() +
                        startDate.getTimezoneOffset() * 60 * 1000);
                    var dayMillis = 1000*60*60*24;

                    function eventFromTemplate(et, forUsers) {
                        var result = clone(et);
                        result.eventTemplateId = result.id;
                        delete result.id;

                        result.date = fmtUTCDate(new Date(
                                startDate.valueOf() + result.dayOffset*dayMillis));
                        delete result.dayOffset;

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
                                    result.invitees.push(s_id);
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

                // one group per event template: a group is 1 element for a
                // collective template, or an array of  N elements (one per
                // user) for an individual event template.
                evGroups: null
            };
        },
        deleteEventGroup: function(id) {
        },
        render: function() {
            var err = this.state.evTemplErr;
            if (err) {
                return <div>{err}</div>;
            }
            var loaded = this.state.evTemplLoaded && this.state.evGroups;
            if (!loaded) {
                return <div>Loading…</div>;
            }

            return <div>
                Based on template: {this.props.scheduleTemplate.name}
                <ul>
                {this.state.evTempl.map((function(et, idx) {
                    return <li key={et.id} className={'event-group-' +
                        (et.isCollective ? 'collective' : 'individual')}>
                        {et.summary}
                        <br/>
                        {JSON.stringify(this.state.evGroups[idx])}
                        <br/>
                        <button type="button"
                            onClick={this.deleteEventGroup.bind(this, et.id)}>
                            Delete
                        </button>
                    </li>;
                }).bind(this))}
                </ul>
            </div>;
        }
    });
})();
