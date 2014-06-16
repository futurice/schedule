/** @jsx React.DOM */

var SchedulingRequestDetail = React.createClass({
    propTypes: {
        id: React.PropTypes.number.isRequired
    },
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
        getRestLoaderMixin('/futuintro/api/scheduletemplates/',
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
            '/futuintro/api/schedulingrequests/' + this.props.id,
            'schedReq', 'schedReqErr');
        compFetchRest.bind(this)(
            '/futuintro/api/schedules/?schedulingRequest=' + this.props.id,
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
            Scheduling request
            <br/>
            From template: {templName}
            <br/>Submitted on {' '}
            {new Date(this.state.schedReq.requestedAt).toString()}
            {' '} by {getUserNameAndEmail(this.state.schedReq.requestedBy,
                this.state.usersById)}

            <ul>
                {this.state.schedules.map((function(s) {
                    return <li key={s.id}>
                        <a href={'../../schedule/' + s.id}>
                            Schedule for {getUserName(s.forUser,
                                this.state.usersById)}
                        </a>
                    </li>;
                }).bind(this))}
            </ul>
        </div>;
    }
});
