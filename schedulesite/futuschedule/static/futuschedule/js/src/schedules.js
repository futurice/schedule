var SchedulesList = React.createClass({
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
            }),
        getRestLoaderMixin(apiRoot + 'schedules/?ordering=-createdAt',
            'schedules', 'schedulesLoaded', 'schedulesErr'),
        getRestLoaderMixin(apiRoot + 'scheduletemplates/',
            'scheduleTemplates', 'scheduleTemplLoaded', 'scheduleTemplErr',
            function() {
                var scheduleTemplById = {};
                this.state.scheduleTemplates.forEach(function(s) {
                    scheduleTemplById[s.id] = s;
                });
                this.setState({
                    scheduleTemplById: scheduleTemplById
                });
            })
    ],
    getInitialState: function() {
        return {
            users: null,
            usersLoaded: false,
            usersErr: '',
            usersById: null,

            schedules: null,
            schedulesLoaded: false,
            schedulesErr: '',

            scheduleTemplates: null,
            scheduleTemplLoaded: false,
            scheduleTemplErr: '',
            scheduleTemplById: null
        };
    },
    render: function() {
        var err;
        ['usersErr', 'schedulesErr', 'scheduleTemplErr'
        ].forEach((function(fName) {
            err = err || this.state[fName];
        }).bind(this));
        if (err) {
            return <div><span className="status-error">{err}</span></div>;
        }

        var loaded = true;
        ['usersLoaded', 'usersById', 'schedulesLoaded', 'scheduleTemplLoaded',
            'scheduleTemplById'
        ].forEach((function(fName) {
            loaded = loaded && Boolean(this.state[fName]);
        }).bind(this));
        if (!loaded) {
            return <div><span className="status-waiting">Loading…</span></div>;
        }

        if (!this.state.schedules.length) {
            return <div>
                <span className="info">
                    There are no schedules.
                </span>
            </div>;
        }

        return <table className="striped">
            <thead>
                <tr>
                    <th>For</th>
                    <th>Template</th>
                    <th>Created</th>
                </tr>
            </thead>
            <tbody>
                {this.state.schedules.map((function(s) {
                    var templateName = 'Unknown';
                    if (s.template in this.state.scheduleTemplById) {
                        templateName =
                            this.state.scheduleTemplById[s.template].name;
                    }
                    return <tr key={s.id}>
                        <td>
                            <a href={'../schedule/' + s.id}>
                                {getUserName(s.forUser, this.state.usersById)}
                            </a>
                        </td>
                        <td>{templateName}</td>
                        <td><DateOnly date={new Date(s.createdAt)} /></td>
                    </tr>;
                }).bind(this))}
            </tbody>
        </table>;
    }
});
