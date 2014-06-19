/** @jsx React.DOM */

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

        return (
            <ul>
                {this.state.schedules.map((function(s) {
                    var templateName = 'Unknown';
                    if (s.template in this.state.scheduleTemplById) {
                        templateName =
                            this.state.scheduleTemplById[s.template].name;
                    }
                    return <li key={s.id}>
                        <a href={'../schedule/' + s.id}>
                            Schedule for {getUserNameAndEmail(s.forUser,
                                this.state.usersById)}
                        </a>
                        <br/>
                        From template: {templateName}
                        <br/>
                        created {new Date(s.createdAt).toString()}
                    </li>;
                }).bind(this))}
            </ul>
        );
    }
});
