/** @jsx React.DOM */

var SchedulesList = React.createClass({
    mixins: [
        getRestLoaderMixin('/futuintro/api/users/',
            'users', 'usersLoaded', 'usersErr', function() {
                var usersById = {};
                this.state.users.forEach(function(u) {
                    usersById[u.id] = u;
                });
                this.setState({
                    usersById: usersById
                });
            }),
        getRestLoaderMixin('/futuintro/api/schedules/?ordering=-createdAt',
            'schedules', 'schedulesLoaded', 'schedulesErr')
    ],
    getInitialState: function() {
        return {
            users: null,
            usersLoaded: false,
            usersErr: '',
            usersById: null,

            schedules: null,
            schedulesLoaded: false,
            schedulesErr: ''
        };
    },
    render: function() {
        var err;
        ['usersErr', 'schedulesErr'].forEach((function(fName) {
            err = err || this.state[fName];
        }).bind(this));
        if (err) {
            return <div><span className="status-error">{err}</span></div>;
        }

        var loaded = true;
        ['usersLoaded', 'usersById', 'schedulesLoaded'
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
                    return <li key={s.id}>
                        <a href={'../schedule/' + s.id}>
                            Schedule for {getUserNameAndEmail(s.forUser,
                                this.state.usersById)}
                        </a>
                        <br/>
                        created {new Date(s.createdAt).toString()}.
                    </li>;
                }).bind(this))}
            </ul>
        );
    }
});
