var SchedulingRequestsList = React.createClass({
    mixins: [
        getRestLoaderMixin(apiRoot + 'schedulingrequests/?ordering=-requestedAt',
            'sReq', 'sReqLoaded', 'sReqErr'),
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
            }),
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
            sReq: null,
            sReqLoaded: false,
            sReqErr: '',

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
        ['sReqErr', 'scheduleTemplErr', 'usersErr'
        ].forEach((function(field) {
            err = err || this.state[field];
        }).bind(this));
        if (err) {
            return <div><span className="status-error">{err}</span></div>;
        }

        var loaded = true;
        ['sReqLoaded', 'scheduleTemplLoaded',
        'scheduleTemplById', 'usersLoaded', 'usersById'].forEach(
                (function(field) {
            loaded = loaded && Boolean(this.state[field]);
        }).bind(this));
        if (!loaded) {
            return <div><span className="status-waiting">Loading…</span></div>;
        }

        if (!this.state.sReq.length) {
            return <div>
                <span className="info">
                    There are no requests to make schedules.
                </span>
            </div>;
        }

        if (!this.state.sReq.length) {
            return <div>
                <span className="info">
                    There are no requests to make schedules.
                </span>
            </div>;
        }

        return <ul>
            {this.state.sReq.map((function(r) {
                return <li key={r.id}>
                    <SchedulingRequest
                        model={r}
                        usersById={this.state.usersById}
                        scheduleTemplById={this.state.scheduleTemplById}
                    />
                </li>;
            }).bind(this))}
        </ul>;
    }
});

var SchedulingRequest = React.createClass({
    propTypes: {
        model: React.PropTypes.object.isRequired,
        usersById: React.PropTypes.object.isRequired,
        scheduleTemplById: React.PropTypes.object.isRequired
    },
    getInitialState: function() {
        return {
            showDeleteBtn: true,
            ajaxInFlight: '',
            ajaxErr: ''
        };
    },
    delete: function() {
        var users = JSON.parse(this.props.model.json).users,
            msg = 'Delete ALL events from Google Calendar for \n' +
                enumSentence(users.map((function(uid) {
                    return getUserName(uid, this.props.usersById);
                }).bind(this))) + '?';
        if (confirm(msg)) {
            this.setState({
                ajaxInFlight: 'Deleting…'
            });
            $.ajax({
                url: '/futuschedule/scheduling-request/' +
                    this.props.model.id + '/',
                type: 'DELETE',
                headers: {'X-CSRFToken': $.cookie('csrftoken')},
                complete: (function(data) {
                    this.setState({
                        ajaxInFlight: ''
                    });
                }).bind(this),
                success: (function(data) {
                    this.setState({
                        ajaxErr: ''
                    });
                }).bind(this),
                error: (function(xhr, txtStatus, saveErr) {
                    this.setState({ajaxErr: getAjaxErr.apply(this, arguments)});
                }).bind(this)
            });
            this.setState({
                showDeleteBtn: false
            });
        }
    },
    render: function() {
        var userText = getUserNameAndEmail(this.props.model.requestedBy,
                this.props.usersById);
        var deleteBox;
        if (this.state.showDeleteBtn) {
            deleteBox = <div>
                    <button type="button" onClick={this.delete}>Delete</button>
                </div>;
        } else if (this.state.ajaxInFlight) {
            deleteBox = <div>
                <span className='status-waiting'>
                    {this.state.ajaxInFlight}
                </span>
            </div>;
        } else if (this.state.ajaxErr) {
            deleteBox = <div>
                <span className='status-error'>{this.state.ajaxErr}</span>
            </div>;
        } else {
            deleteBox = <div>
                <span className='info'>Deleted</span>
            </div>;
        }

        var status = this.props.model.status,
            modelJson = JSON.parse(this.props.model.json),
            link = <span>
                For {enumSentence(modelJson.users.map((function(uid) {
                    return getUserName(uid, this.props.usersById);
                }).bind(this)))}
            </span>;
        if (status == 'SUCCESS') {
            link = <a href={'../scheduling-request/' + this.props.model.id}>
                    {link}
                </a>;
        }

        var templName = 'Unknown',
            templId = modelJson.scheduleTemplate;
        if (templId in this.props.scheduleTemplById) {
            templName = this.props.scheduleTemplById[templId].name;
        }

        var statusLine = (function() {
            var clsName, txt;
            switch (this.props.model.status) {
                case 'SUCCESS':
                    clsName = 'success';
                    txt = 'Status: ' + this.props.model.status;
                    break;
                case 'ERROR':
                    clsName = 'error';
                    txt = 'Status: ' + this.props.model.status;
                    break;
                default:
                    clsName = 'info';
                    txt = 'Status: ' + this.props.model.status;
            }
            return <span className={clsName}>{txt}</span>;
        }).bind(this)();

        return <div>
            {link}
            <br/>
            From template: {templName}
            <br/>
            Submitted on {new Date(this.props.model.requestedAt).toString()}
            {' '} by {userText}

            <br/>
            {statusLine}

            {this.props.model.status == 'ERROR' ?
                <PreviewExpandBox text={this.props.model.error}/> : ''}
            {deleteBox}
        </div>;
    }
});
