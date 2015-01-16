var ScheduleDetail;
(function() {
    ScheduleDetail = React.createClass({
        propTypes: {
            id: React.PropTypes.number.isRequired
        },
        mixins: [
            getRestLoaderMixin(apiRoot + 'users/',
                'users', 'usersLoaded', 'usersErr', function() {
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
                users: null,
                usersLoaded: false,
                usersErr: '',
                usersById: null,

                schedule: null,
                scheduleErr: '',

                events: null,
                eventsLoaded: false,
                eventsErr: '',
                eventsParsed: null
            };
        },
        componentDidMount: function() {
            compFetchItemRest.bind(this)(
                apiRoot + 'schedules/' + this.props.id,
                'schedule', 'scheduleErr', function() {
                    compFetchRest.bind(this)(
                        apiRoot + 'events?schedules=' +
                            this.state.schedule.id,
                        'events', 'eventsLoaded', 'eventsErr',
                        function() {
                            this.setState({
                                eventsParsed: this.state.events.map(
                                        function(e) {
                                    return JSON.parse(e.json);
                                }).sort(function(a, b) {
                                    var ta = new Date(a.start.dateTime).valueOf(),
                                        tb = new Date(b.start.dateTime).valueOf();
                                    return ta - tb;
                                })
                            });
                        }
                    );
                });
        },
        render: function() {
            var err;
            ['usersErr', 'scheduleErr', 'eventsErr'].forEach((function(fName) {
                err = err || this.state[fName];
            }).bind(this));
            if (err) {
                return <div><span className="status-error">{err}</span></div>;
            }

            var loaded = true;
            ['usersLoaded', 'usersById', 'schedule', 'eventsLoaded',
                'eventsParsed'
            ].forEach((function(fName) {
                loaded = loaded && Boolean(this.state[fName]);
            }).bind(this));
            if (!loaded) {
                return <div><span className="status-waiting">Loading…</span></div>;
            }

            var eventsBox;
            if (!this.state.eventsParsed.length) {
                eventsBox = <div>
                    <span className="info">
                        There are no events.
                    </span>
                </div>;
            } else {
                eventsBox = <ul>
                    {this.state.eventsParsed.map(function(e) {
                        return <li key={e.id}>
                            <GoogleCalendarEvent model={e}/>
                        </li>;
                    })}
                </ul>;
            }

            return <div>
                <h1>
                    Schedule for {getUserNameAndEmail(
                            this.state.schedule.forUser, this.state.usersById)}
                </h1>
                {eventsBox}
            </div>;
        }
    });

    var GoogleCalendarEvent = React.createClass({
        propTypes: {
            model: React.PropTypes.object.isRequired
        },
        render: function() {
            var m = this.props.model;
            return <div>
                <a href={m.htmlLink}>{m.summary || '(No title)'}</a>
                <div className="event-description">
                    {m.description || '(No description)'}
                </div>
                {new Date(m.start.dateTime).toString() + ' → ' +
                    new Date(m.end.dateTime).toString()}
                <br/>
                Where: {m.location || '—'}
                <br/>
                Who: {' '}
                <ul className="comma-separated">
                    {m.attendees.filter(function(a) {
                        return !a.resource;
                    }).map(function(a) {
                        return <li key={a.email}>
                            {/* there's also {a.email} available */}
                            {a.displayName}
                        </li>;
                    })}
                </ul>.
            </div>;
            return <span>{JSON.stringify(this.props.model)}</span>;
        }
    });
})();
