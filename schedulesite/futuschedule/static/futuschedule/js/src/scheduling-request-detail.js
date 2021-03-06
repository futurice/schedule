var SchedulingRequestDetail = React.createClass({
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
            }),
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
    componentDidMount: function() {
        compFetchItemRest.bind(this)(
            apiRoot + 'schedulingrequests/' + this.props.id,
            'schedReq', 'schedReqErr');
        compFetchRest.bind(this)(
            apiRoot + 'schedules/?schedulingRequest=' + this.props.id,
            'schedules', 'schedulesLoaded', 'schedulesErr');
    },
    getInitialState: function() {
        return {
            schedReq: null,
            schedReqErr: '',

            schedules: null,
            schedulesLoaded: false,
            schedulesErr: '',

            scheduleTemplates: null,
            scheduleTemplLoaded: false,
            scheduleTemplErr: '',
            scheduleTemplById: null,

            users: null,
            usersLoaded: false,
            usersErr: '',
            usersById: null
        };
    },
    render: function() {
        var err;
        ['schedReqErr', 'schedulesErr', 'scheduleTemplErr', 'usersErr'
        ].forEach((function(fName) {
            err = err || this.state[fName];
        }).bind(this));
        if (err) {
            return <div><span className="status-error">{err}</span></div>;
        }

        var loaded = true;
        ['schedulesLoaded', 'scheduleTemplLoaded', 'scheduleTemplById',
            'usersLoaded', 'usersById'
        ].forEach((function(fName) {
            loaded = loaded && Boolean(this.state[fName]);
        }).bind(this));
        if (!loaded) {
            return <div><span className="status-waiting">Loading…</span></div>;
        }

        var templName = 'Unknown',
            srJson = JSON.parse(this.state.schedReq.json),
            templId = srJson.scheduleTemplate;
        if (templId in this.state.scheduleTemplById) {
            templName = this.state.scheduleTemplById[templId].name;
        }
        return <div>
            From template: {templName}.
            <br/>Submitted on {' '}
            <DateOnly date={new Date(this.state.schedReq.requestedAt)}/>
            {' '} by {getUserName(this.state.schedReq.requestedBy,
                this.state.usersById)}.

            <p>Individual schedules:</p>

            <ul>
                {this.state.schedules.map((function(s) {
                    return <li key={s.id}>
                        <a href={'../../schedule/' + s.id}>
                            {getUserName(s.forUser, this.state.usersById)}
                        </a>
                    </li>;
                }).bind(this))}
            </ul>
        </div>;
    }
});
